from datetime import date, timedelta
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
import config


def init():
    FacebookAdsApi.init(access_token=config.META_ACCESS_TOKEN)


def get_insights(days: int = 7) -> dict:
    """
    Retorna métricas consolidadas dos últimos N dias.
    """
    init()

    end_date = date.today() - timedelta(days=1)   # ontem (dados completos)
    start_date = end_date - timedelta(days=days - 1)

    account = AdAccount(config.META_AD_ACCOUNT_ID)

    fields = [
        AdsInsights.Field.campaign_name,
        AdsInsights.Field.impressions,
        AdsInsights.Field.clicks,
        AdsInsights.Field.spend,
        AdsInsights.Field.ctr,
        AdsInsights.Field.cpc,
        AdsInsights.Field.reach,
        AdsInsights.Field.frequency,
        AdsInsights.Field.actions,
    ]

    params = {
        "time_range": {
            "since": start_date.isoformat(),
            "until": end_date.isoformat(),
        },
        "level": "campaign",
        "limit": 100,
    }

    insights = account.get_insights(fields=fields, params=params)

    campaigns = []
    totals = {
        "impressions": 0,
        "clicks": 0,
        "spend": 0.0,
        "reach": 0,
        "conversions": 0,
    }

    for row in insights:
        conversions = _extract_conversions(row.get("actions", []))

        camp = {
            "name": row.get("campaign_name", "—"),
            "impressions": int(row.get("impressions", 0)),
            "clicks": int(row.get("clicks", 0)),
            "spend": float(row.get("spend", 0)),
            "ctr": float(row.get("ctr", 0)),
            "cpc": float(row.get("cpc", 0)),
            "reach": int(row.get("reach", 0)),
            "frequency": float(row.get("frequency", 0)),
            "conversions": conversions,
        }
        campaigns.append(camp)

        totals["impressions"] += camp["impressions"]
        totals["clicks"] += camp["clicks"]
        totals["spend"] += camp["spend"]
        totals["reach"] += camp["reach"]
        totals["conversions"] += conversions

    totals["ctr"] = (totals["clicks"] / totals["impressions"] * 100) if totals["impressions"] else 0
    totals["cpc"] = (totals["spend"] / totals["clicks"]) if totals["clicks"] else 0
    totals["cpa"] = (totals["spend"] / totals["conversions"]) if totals["conversions"] else 0

    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "campaigns": campaigns,
        "totals": totals,
    }


def _extract_conversions(actions: list) -> int:
    conversion_types = {
        "offsite_conversion.fb_pixel_purchase",
        "offsite_conversion.fb_pixel_lead",
        "lead",
        "purchase",
    }
    total = 0
    for action in actions:
        if action.get("action_type") in conversion_types:
            total += int(float(action.get("value", 0)))
    return total
