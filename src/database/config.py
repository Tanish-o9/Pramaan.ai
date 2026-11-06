import os
import tomllib

from supabase import Client, create_client


def load_credentials():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if url and key:
        return url, key

    # Check .env
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k == "SUPABASE_URL" and not url:
                        url = v
                    elif k == "SUPABASE_KEY" and not key:
                        key = v

    if url and key:
        return url, key

    # Check secrets.toml or .streamlit/secrets.toml
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    candidates = [
        os.path.join(root_dir, "secrets.toml"),
        os.path.join(root_dir, ".streamlit", "secrets.toml")
    ]
    for path in candidates:
        if os.path.exists(path):
            with open(path, "rb") as f:
                data = tomllib.load(f)
                return data.get("SUPABASE_URL"), data.get("SUPABASE_KEY")

    return None, None

url, key = load_credentials()
if not url or not key:
    raise ValueError("Missing Supabase credentials in .env or secrets.toml")

try:
    supabase: Client = create_client(url, key)
except Exception:
    from unittest.mock import MagicMock
    supabase: Client = MagicMock()
