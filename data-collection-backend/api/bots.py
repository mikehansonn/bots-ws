from fastapi import APIRouter, HTTPException
from utils.db import get_database
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

class BotGet(BaseModel):
    mac: str

@router.get("/bot/get")
def get_bot(details: BotGet):
    db = get_database()
    
    response = db.table("bots").select("*").eq("mac", str(details.mac)).single().execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"Bot with MAC {details.mac} not found"
        )
    
    return response.data[0]

class BotUpdate(BaseModel):
    mac: str
    compass_angle: Optional[float] = None
    compass_timestamp: Optional[str] = None
    compass_drdy_error_flag: Optional[int] = None
    compass_slow_read_flag: Optional[int] = None
    gps_now_x: Optional[float] = None
    gps_now_y: Optional[float] = None
    gps_timestamp: Optional[str] = None
    gps_avg_read_time: Optional[float] = None
    gps_max_read_time: Optional[float] = None
    gps_hacc: Optional[float] = None
    gps_hacc_status: Optional[str] = None
    gps_count: Optional[int] = None
    gps_satellites_used: Optional[int] = None
    gps_pdop: Optional[float] = None
    heartbeat_timestamp: Optional[str] = None
    heartbeat_period: Optional[int] = None
    heartbeat_delta: Optional[int] = None
    status_string: Optional[str] = None
    status_color: Optional[str] = None
    watchdog_string: Optional[str] = None
    watchdog_color: Optional[str] = None
    route_timestamp: Optional[str] = None
    route_now_x: Optional[float] = None
    route_now_y: Optional[float] = None
    route_hacc: Optional[float] = None
    route_tgt_x: Optional[float] = None
    route_tgt_y: Optional[float] = None
    route_tgt_heading: Optional[float] = None
    route_topspeed: Optional[float] = None
    route_measured_speed: Optional[float] = None

@router.post("/bot/update")
def update_bot(bot_data: BotUpdate):
    db = get_database()
    
    # Check if bot exists (don't use .single() to avoid error on 0 rows)
    existing_bot = db.table("bots").select("*").eq("mac", bot_data.mac).execute()
    
    # Prepare data for insert/update (exclude None values and mac for updates)
    update_data = {}
    insert_data = {"mac": bot_data.mac}  # Always include mac for inserts
    
    for field, value in bot_data.model_dump().items():
        if value is not None:
            insert_data[field] = value
            if field != "mac":  # Don't include mac in update data
                update_data[field] = value
    
    # Handle historical_positions if GPS coordinates are provided
    if bot_data.gps_now_x is not None and bot_data.gps_now_y is not None:
        new_position = [float(bot_data.gps_now_x), float(bot_data.gps_now_y)]
        
        # Get existing historical_positions or initialize empty list
        existing_positions = []
        if existing_bot.data and len(existing_bot.data) > 0:
            existing_positions = existing_bot.data[0].get("historical_positions", [])
        
        # Add new position and keep only last 50
        existing_positions.append(new_position)
        if len(existing_positions) > 50:
            existing_positions = existing_positions[-50:]  # Keep last 50
        
        # Add to both insert and update data
        insert_data["historical_positions"] = existing_positions
        update_data["historical_positions"] = existing_positions
    
    # If bot doesn't exist, create it
    if not existing_bot.data or len(existing_bot.data) == 0:
        response = db.table("bots").insert(insert_data).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create bot with MAC {bot_data.mac}"
            )
        
        return response.data[0]
    
    # Bot exists, update it
    if not update_data:
        # No fields to update, return existing bot
        return existing_bot.data[0]
    
    response = db.table("bots").update(update_data).eq("mac", bot_data.mac).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update bot with MAC {bot_data.mac}"
        )
    
    return response.data[0]