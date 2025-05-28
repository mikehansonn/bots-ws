import asyncio
import requests
from logging.handlers import RotatingFileHandler
import Robot_IDClass3
import time
import os
import logging
from getmac import get_mac_address 

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Server configuration
SERVER_IP = "192.168.86.100"  # Replace with your actual server IP
PORT = 9000
BASE_URL = f"http://{SERVER_IP}:{PORT}"

# Automatically determine the robot ID
cwd = os.getcwd()
parts = cwd.split(os.sep)
robot_id = parts[2] # /home/arnold/bot-sensor-writes
MAC_ID = get_mac_address()

compass_file = f"/home/{robot_id}/robot/cytron/compass_broadcast.txt"
gps_file = f"/home/{robot_id}/robot/cytron/gps_broadcast.txt"
heartbeat_file = f"/home/{robot_id}/robot/realtime/{robot_id}_heartbeat_broadcast.txt"
ALERT_LEVEL_FILE = f"/home/{robot_id}/robot/swarm/alert_level.txt"
ROBOT_HEARTBEAT_FILE = f"/home/{robot_id}/robot/realtime/{robot_id}_heartbeat_broadcast.txt"

def read_alert_level():
    try:
        if os.path.exists(ALERT_LEVEL_FILE):
            with open(ALERT_LEVEL_FILE, 'r') as f:
                data = f.read().strip()
                alert_level_data = data.split(',')
                return alert_level_data[0] if alert_level_data else "0"
        return "0" 
    except Exception as e:
        logger.error(f"Error reading alert level: {e}")
        return "0"

def get_heartbeat_period(alert_level):
    try:
        level = int(alert_level)
        if level == 1:
            return 0.75
        elif level == 2:
            return 0.5
        elif level == 3:
            return 0.25
        else: 
            return 1.0
    except ValueError:
        return 1.0 

async def generate_robot_heartbeat():
    previous_heartbeat_timestamp = 0

    while True:
        try:
            alert_level = read_alert_level()
            heartbeat_period = get_heartbeat_period(alert_level)

            heartbeat_timestamp = time.time()
            delta_heartbeat = 0.0
            if previous_heartbeat_timestamp > 0:
                delta_heartbeat = heartbeat_timestamp - previous_heartbeat_timestamp

            heartbeat_data = f"{heartbeat_timestamp},{heartbeat_period},{delta_heartbeat:.2f}"

            with open(ROBOT_HEARTBEAT_FILE, 'w') as f:
                f.write(heartbeat_data)

            previous_heartbeat_timestamp = heartbeat_timestamp

            await asyncio.sleep(heartbeat_period)

        except Exception as e:
            logger.error(f"Error generating heartbeat: {e}")
            await asyncio.sleep(1.0) 

async def read_sensor_data():
    while True:
        try:
            payload = {}

            # compass data
            if os.path.exists(compass_file):
                try:
                    with open(compass_file, 'r') as f:
                        content = f.read().strip()
                        compass_data = content.split(',')

                        if len(compass_data) == 4:
                            payload["compass_angle"] = float(compass_data[0])
                            payload["compass_timestamp"] = str(compass_data[1])
                            payload["compass_drdy_error_flag"] = int(compass_data[2])
                            payload["compass_slow_read_flag"] = int(compass_data[3])
                except Exception as e:
                    logger.error(f"Error reading compass data: {e}")
                    continue

            # gps data
            if os.path.exists(gps_file):
                try:
                    with open(gps_file, 'r') as f:
                        content = f.read().strip()
                        gps_data = content.split(',')

                        if len(gps_data) >= 8:
                            payload["gps_now_x"] = float(gps_data[0])
                            payload["gps_now_y"] = float(gps_data[1])
                            payload["gps_timestamp"] = str(gps_data[2])
                            payload["gps_avg_read_time"] = float(gps_data[3])
                            payload["gps_max_read_time"] = float(gps_data[4])
                            payload["gps_hacc"] = float(gps_data[5])
                            payload["gps_hacc_status"] = str(gps_data[6])
                            payload["gps_count"] = int(gps_data[7])

                            if len(gps_data) >= 9:
                                payload["gps_satellites_used"] = int(gps_data[8])

                            if len(gps_data) >= 10:
                                payload["gps_pdop"] = float(gps_data[9])  # Changed from hdop to pdop to match API
                except Exception as e:
                    logger.error(f"Error reading GPS data: {e}")
                    continue

            # heartbeat data
            if os.path.exists(heartbeat_file):
                try:
                    with open(heartbeat_file, 'r') as f:
                        content = f.read().strip()
                        heartbeat_data = content.split(',')

                        if len(heartbeat_data) == 3:
                            payload['heartbeat_timestamp'] = str(heartbeat_data[0])  # timestamp as string
                            payload['heartbeat_period'] = int(float(heartbeat_data[1]))  # period as int
                            payload['heartbeat_delta'] = int(float(heartbeat_data[2]))  # delta as int
                except Exception as e:
                    logger.error(f"Error reading heartbeat data: {e}")
                    continue
            
            return payload
        except Exception as e:
            logger.error(f"Error in read_sensor_data: {e}")
            await asyncio.sleep(1)
            continue

async def write_sensor_data(data):
    """Send sensor data to the FastAPI server every 1 second"""
    try:
        # Add the robot MAC address to the payload
        payload = {
            "mac": MAC_ID,  # Using robot_id as MAC
            **data  # Spread all the sensor data
        }
        
        response = requests.post(
            f"{BASE_URL}/bot/update",
            json=payload,
            timeout=5 
        )
        
        if response.status_code == 200:
            logger.info(f"Successfully updated bot data for {robot_id}")
            return True
        else:
            logger.error(f"Failed to update bot data. Status: {response.status_code}, Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error sending data to server: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error in write_sensor_data: {e}")
        return False

async def sensor_data_loop():
    """Main loop to read and send sensor data every 1 second"""
    while True:
        try:
            sensor_data = await read_sensor_data()
            
            if sensor_data:
                await write_sensor_data(sensor_data)
            else:
                logger.warning("No sensor data available to send")
                
        except Exception as e:
            logger.error(f"Error in sensor data loop: {e}")
            
        await asyncio.sleep(1.0)

async def main():
    while True:
        try:
            heartbeat_task = asyncio.create_task(generate_robot_heartbeat())
            sensor_task = asyncio.create_task(sensor_data_loop())
            
            await asyncio.gather(heartbeat_task, sensor_task)
            
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())