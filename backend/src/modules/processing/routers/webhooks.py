from fastapi import APIRouter, Header, HTTPException
from src.core.config import settings
from src.modules.processing.schemas import WebhookPayload
from src.modules.processing.services.callback import process_webhook

router = APIRouter(prefix="/processing", tags=["Processing"])

@router.post("/webhooks")
async def webhook_receiver(
    payload: WebhookPayload, 
    x_internal_token: str = Header(...)
):
    if x_internal_token != settings.INTERNAL_WEBHOOK_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")
    
    await process_webhook(payload)
    return {"status": "accepted"}