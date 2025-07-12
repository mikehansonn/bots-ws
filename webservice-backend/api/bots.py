from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from utils.db import get_database

router = APIRouter(prefix="/api/bot")

class BotData(BaseModel):
    bot_id: str
    user_id: str

@router.get("/find/{robot_id}")
async def get_robot(robot_id: str):
    db = get_database()

    try: 
        bot_result = db.table("bots").select("mac").eq("mac", robot_id).execute()

        if not bot_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No Bot with the following ID: {str(robot_id)}"
            )
       
        return {
            "data": bot_result
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failure to find bot: {robot_id}"
        )

@router.get("/user-bots/{user_id}")
async def get_user_bots(user_id: str):
    db = get_database()

    try:
        user_result = db.table("users").select("*").eq("id", user_id).execute()

        if not user_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No User with the following ID: {str(user_id)}"
            )
        
        robots = user_result.data[0]["robots"]

        if not robots:
            return []
        
        data = []

        for robot_id in robots:
            bot_result = db.table("bots").select("*").eq("mac", robot_id).execute()
        
            if not bot_result.data[0]:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No Bot with the following ID: {str(robot_id)}"
                )
            
            data.append(bot_result.data[0])
        
        return data
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failure finding {user_id}'s bots"
        )


@router.post("/add")
async def add_bot_to_account(bot_data: BotData):
    db = get_database()

    try: 
        bot_result = db.table("bots").select("*").eq("mac", bot_data.bot_id).execute()
        
        if not bot_result.data[0]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No Bot with the following ID: {str(bot_data.bot_id)}"
            )
        
        bot_result = bot_result.data[0]

        if bot_result["user_assignment"] != None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot is already assigned to another account: {str(bot_data.bot_id)}"
            )

        user_result = db.table("users").select("*").eq("username", bot_data.user_id).execute()

        if not user_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No User with the following ID: {str(bot_data.user_id)}"
            )
        
        user = user_result.data[0]
        current_bots = user.get("robots", [])
        
        if bot_data.bot_id not in current_bots:
            current_bots.append(bot_data.bot_id)

        bot_update = db.table("bots").update({"user_assignment": bot_data.user_id}).eq("mac", bot_data.bot_id).execute()

        user_update = db.table("users").update({"robots": current_bots}).eq("username", bot_data.user_id).execute()

        return {
            "message": f"Bot {bot_data.bot_id} successfully assigned to user {bot_data.user_id}",
            "bot_id": bot_data.bot_id,
            "user_id": bot_data.user_id
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failure to add bot: {bot_data.bot_id} to user: {bot_data.user_id}"
        )
    