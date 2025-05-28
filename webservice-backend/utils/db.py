import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def get_database():
    '''Get database connection and return'''
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    return supabase