"""
HubSpot to BigQuery ETL Pipeline - CEO Metrics Suite v4.0
=========================================================
Enhanced ETL with ALL deal properties, associated contacts,
and filtering for "3PL New Business" pipeline only.

Author: Data Engineering Team
Version: 4.0.0 - Full Deal Properties + Contacts
"""

import os
import logging
import time
import json
import yaml
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

import pandas as pd
from hubspot import HubSpot
from hubspot.crm.deals import ApiException as DealsApiException
from hubspot.crm.contacts import ApiException as ContactsApiException
from google.cloud import bigquery
from google.api_core.exceptions import GoogleAPIError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration from .env.yaml if environment variables are not set
def load_config_from_yaml():
    """Load configuration from .env.yaml file as fallback."""
    config = {}
    yaml_path = Path(__file__).parent / '.env.yaml'
    if yaml_path.exists():
        try:
            with open(yaml_path, 'r') as f:
                config = yaml.safe_load(f) or {}
            logger.info(f"Loaded configuration from {yaml_path}")
        except Exception as e:
            logger.warning(f"Could not load .env.yaml: {e}")
    return config

# Load from YAML as fallback
_yaml_config = load_config_from_yaml()

# Environment Variables (with YAML fallback)
PROJECT_ID = os.environ.get('PROJECT_ID') or _yaml_config.get('PROJECT_ID')
DATASET_ID = os.environ.get('DATASET_ID') or _yaml_config.get('DATASET_ID')
TABLE_ID = os.environ.get('TABLE_ID') or _yaml_config.get('TABLE_ID', 'deals_snapshots')
HUBSPOT_ACCESS_TOKEN = os.environ.get('HUBSPOT_ACCESS_TOKEN') or _yaml_config.get('HUBSPOT_ACCESS_TOKEN')

# Pipeline filter - Only sync deals from this pipeline
TARGET_PIPELINE_NAME = "3PL New Business"

# Contact properties to fetch
CONTACT_PROPERTIES = [
    'firstname',
    'lastname',
    'email',
    'phone',
    'mobilephone',
    'jobtitle',
    'company',
    'lifecyclestage',
    'hs_lead_status',
    'country',
    'city',
    'state',
    'address',
    'zip',
    'website',
    'industry',
    'annualrevenue',
    'numberofemployees',
    'createdate',
    'lastmodifieddate',
    'notes_last_contacted',
    'notes_last_updated',
    'hs_email_last_email_name',
    'hs_email_last_open_date',
    'hs_email_last_click_date',
    'hs_analytics_source',
    'hs_analytics_first_url',
    'hubspot_owner_id',
]

# BigQuery Schema for Meetings
MEETINGS_SCHEMA = [
    bigquery.SchemaField('meeting_id', 'STRING', mode='REQUIRED'),
    bigquery.SchemaField('title', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('meeting_type', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('meeting_outcome', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('start_time', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('end_time', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('created_at', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('updated_at', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('duration_minutes', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('owner_id', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('owner_name', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('owner_email', 'STRING', mode='NULLABLE'),
    # Created by fields (who actually booked the meeting)
    bigquery.SchemaField('created_by_user_id', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('created_by_name', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('created_by_email', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('meeting_source', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('associated_deal_ids', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('associated_contact_ids', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('associated_company_ids', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('body', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('internal_notes', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('location', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('meeting_link', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('snapshot_timestamp', 'TIMESTAMP', mode='REQUIRED'),
    bigquery.SchemaField('snapshot_date', 'DATE', mode='REQUIRED'),
]

# BigQuery Schema Definition - Extended with all fields
BIGQUERY_SCHEMA = [
    # Core identifiers
    bigquery.SchemaField('hs_object_id', 'STRING', mode='REQUIRED'),
    bigquery.SchemaField('dealname', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('dealtype', 'STRING', mode='NULLABLE'),

    # Financial
    bigquery.SchemaField('amount', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('deal_currency_code', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('hs_tcv', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('hs_acv', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('hs_arr', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('hs_mrr', 'FLOAT64', mode='NULLABLE'),

    # Pipeline & Stage
    bigquery.SchemaField('dealstage', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('dealstage_label', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('pipeline', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('pipeline_label', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('hs_deal_stage_probability', 'FLOAT64', mode='NULLABLE'),

    # Dates
    bigquery.SchemaField('closedate', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('createdate', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('hs_lastmodifieddate', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('notes_last_updated', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('notes_last_contacted', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('hs_date_entered_closedwon', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('hs_date_entered_closedlost', 'TIMESTAMP', mode='NULLABLE'),

    # Owner
    bigquery.SchemaField('hubspot_owner_id', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('owner_name', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('owner_email', 'STRING', mode='NULLABLE'),

    # Forecasting
    bigquery.SchemaField('hs_forecast_category', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('hs_forecast_probability', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('hs_manual_forecast_category', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('hs_priority', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('hs_next_step', 'STRING', mode='NULLABLE'),

    # Activity & Engagement
    bigquery.SchemaField('num_associated_contacts', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('num_contacted_notes', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('num_notes', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('engagements_last_meeting_booked', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('hs_latest_meeting_activity', 'TIMESTAMP', mode='NULLABLE'),
    bigquery.SchemaField('hs_sales_email_last_replied', 'TIMESTAMP', mode='NULLABLE'),

    # Win/Loss
    bigquery.SchemaField('closed_lost_reason', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('closed_won_reason', 'STRING', mode='NULLABLE'),

    # Custom properties (stored as JSON for flexibility)
    bigquery.SchemaField('description', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('all_properties_json', 'STRING', mode='NULLABLE'),

    # Associated Contacts (up to 5 primary contacts)
    bigquery.SchemaField('contact_count', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('primary_contact_id', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('primary_contact_name', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('primary_contact_email', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('primary_contact_phone', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('primary_contact_jobtitle', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('primary_contact_company', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('all_contacts_json', 'STRING', mode='NULLABLE'),

    # Associated Company
    bigquery.SchemaField('company_id', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('company_name', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('company_domain', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('company_industry', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('company_country', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('company_city', 'STRING', mode='NULLABLE'),
    bigquery.SchemaField('company_revenue', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('company_employees', 'INT64', mode='NULLABLE'),

    # Calculated fields
    bigquery.SchemaField('days_in_current_stage', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('days_since_created', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('days_to_close', 'INT64', mode='NULLABLE'),
    bigquery.SchemaField('weighted_amount', 'FLOAT64', mode='NULLABLE'),
    bigquery.SchemaField('is_open', 'BOOL', mode='NULLABLE'),
    bigquery.SchemaField('is_won', 'BOOL', mode='NULLABLE'),
    bigquery.SchemaField('is_lost', 'BOOL', mode='NULLABLE'),
    bigquery.SchemaField('deal_age_status', 'STRING', mode='NULLABLE'),

    # Snapshot metadata
    bigquery.SchemaField('snapshot_timestamp', 'TIMESTAMP', mode='REQUIRED'),
    bigquery.SchemaField('snapshot_date', 'DATE', mode='REQUIRED'),
]


def convert_hubspot_timestamp(timestamp_str: Optional[str]) -> Optional[str]:
    """Convert HubSpot timestamp to BigQuery-compatible ISO-8601 format."""
    if not timestamp_str:
        return None

    try:
        if str(timestamp_str).isdigit():
            timestamp_ms = int(timestamp_str)
            dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
            return dt.isoformat()

        if 'T' in str(timestamp_str) or '-' in str(timestamp_str):
            for fmt in [
                '%Y-%m-%dT%H:%M:%S.%fZ',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%d'
            ]:
                try:
                    ts = str(timestamp_str).replace('+00:00', 'Z').replace('Z', '')
                    dt = datetime.strptime(ts, fmt.replace('Z', ''))
                    dt = dt.replace(tzinfo=timezone.utc)
                    return dt.isoformat()
                except ValueError:
                    continue

        return None
    except Exception as e:
        logger.warning(f"Error converting timestamp '{timestamp_str}': {e}")
        return None


def parse_timestamp_to_datetime(timestamp_str: Optional[str]) -> Optional[datetime]:
    """Parse timestamp string to datetime object for calculations."""
    if not timestamp_str:
        return None

    iso_str = convert_hubspot_timestamp(timestamp_str)
    if not iso_str:
        return None

    try:
        return datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
    except:
        return None


def fetch_all_deal_properties(hubspot_client: HubSpot) -> List[str]:
    """Fetch ALL available deal properties from HubSpot."""
    logger.info("Fetching all available deal properties...")
    properties = []

    try:
        response = hubspot_client.crm.properties.core_api.get_all(object_type='deals')
        for prop in response.results:
            properties.append(prop.name)
        logger.info(f"Found {len(properties)} deal properties")
        return properties
    except Exception as e:
        logger.warning(f"Could not fetch deal properties: {e}")
        # Return default properties if fetch fails
        return [
            'hs_object_id', 'dealname', 'dealtype', 'amount', 'deal_currency_code',
            'hs_tcv', 'hs_acv', 'hs_arr', 'hs_mrr', 'dealstage', 'pipeline',
            'hs_deal_stage_probability', 'closedate', 'createdate', 'hs_lastmodifieddate',
            'notes_last_updated', 'notes_last_contacted', 'hs_date_entered_closedwon',
            'hs_date_entered_closedlost', 'hubspot_owner_id', 'hs_forecast_category',
            'hs_forecast_probability', 'hs_manual_forecast_category', 'hs_priority',
            'hs_next_step', 'num_associated_contacts', 'num_contacted_notes', 'num_notes',
            'engagements_last_meeting_booked', 'hs_latest_meeting_activity',
            'hs_sales_email_last_replied', 'closed_lost_reason', 'closed_won_reason',
            'description'
        ]


def fetch_pipelines(hubspot_client: HubSpot) -> Tuple[Dict, Dict, Optional[str]]:
    """Fetch all deal pipelines and stages from HubSpot. Returns target pipeline ID."""
    logger.info("Fetching deal pipelines...")
    pipelines_dict = {}
    stages_dict = {}
    target_pipeline_id = None

    try:
        pipelines = hubspot_client.crm.pipelines.pipelines_api.get_all(object_type='deals')

        for pipeline in pipelines.results:
            pipeline_id = pipeline.id
            pipeline_label = pipeline.label

            # Check if this is our target pipeline
            if pipeline_label == TARGET_PIPELINE_NAME:
                target_pipeline_id = pipeline_id
                logger.info(f"Found target pipeline '{TARGET_PIPELINE_NAME}' with ID: {pipeline_id}")

            pipelines_dict[pipeline_id] = {
                'label': pipeline_label,
                'stages': {},
                'stage_order': {}
            }

            for idx, stage in enumerate(pipeline.stages):
                stage_id = stage.id
                stage_label = stage.label
                pipelines_dict[pipeline_id]['stages'][stage_id] = stage_label
                pipelines_dict[pipeline_id]['stage_order'][stage_id] = idx
                stages_dict[stage_id] = {
                    'label': stage_label,
                    'pipeline_id': pipeline_id,
                    'order': idx
                }

        logger.info(f"Fetched {len(pipelines_dict)} pipelines with stages")

        if not target_pipeline_id:
            logger.warning(f"Target pipeline '{TARGET_PIPELINE_NAME}' not found! Available pipelines: {[p['label'] for p in pipelines_dict.values()]}")

        return pipelines_dict, stages_dict, target_pipeline_id

    except Exception as e:
        logger.warning(f"Could not fetch pipelines: {e}")
        return {}, {}, None


def fetch_owners(hubspot_client: HubSpot) -> Dict[str, Dict[str, str]]:
    """Fetch all owners from HubSpot with pagination, including archived owners."""
    logger.info("Fetching deal owners (including archived)...")
    owners_dict = {}

    # Fetch active owners
    try:
        after = None
        while True:
            if after:
                owners = hubspot_client.crm.owners.owners_api.get_page(limit=100, after=after)
            else:
                owners = hubspot_client.crm.owners.owners_api.get_page(limit=100)

            for owner in owners.results:
                owner_id = str(owner.id)
                owner_name = f"{owner.first_name or ''} {owner.last_name or ''}".strip() or 'Unknown'
                owners_dict[owner_id] = {
                    'name': owner_name,
                    'email': owner.email or ''
                }

            if owners.paging and owners.paging.next:
                after = owners.paging.next.after
            else:
                break

        logger.info(f"Fetched {len(owners_dict)} active owners")
    except Exception as e:
        logger.warning(f"Could not fetch active owners: {e}")

    # Also fetch archived owners (they may still be assigned to deals)
    try:
        after = None
        archived_count = 0
        while True:
            if after:
                owners = hubspot_client.crm.owners.owners_api.get_page(limit=100, after=after, archived=True)
            else:
                owners = hubspot_client.crm.owners.owners_api.get_page(limit=100, archived=True)

            for owner in owners.results:
                owner_id = str(owner.id)
                if owner_id not in owners_dict:
                    owner_name = f"{owner.first_name or ''} {owner.last_name or ''}".strip() or 'Unknown (Archived)'
                    owners_dict[owner_id] = {
                        'name': f"{owner_name} (Archived)",
                        'email': owner.email or ''
                    }
                    archived_count += 1

            if owners.paging and owners.paging.next:
                after = owners.paging.next.after
            else:
                break

        if archived_count > 0:
            logger.info(f"Fetched {archived_count} archived owners")
    except Exception as e:
        logger.debug(f"Could not fetch archived owners (may not be supported): {e}")

    logger.info(f"Total owners fetched: {len(owners_dict)}. Sample IDs: {list(owners_dict.keys())[:10]}")
    return owners_dict


def fetch_associated_contacts(hubspot_client: HubSpot, deal_id: str, max_retries: int = 3) -> List[Dict]:
    """Fetch associated contacts for a deal using HubSpot API with retry logic."""
    contacts = []
    contact_ids = []

    for attempt in range(max_retries):
        try:
            # Try using the associations v4 basic API (HubSpot SDK v9+)
            try:
                associations = hubspot_client.crm.associations.v4.basic_api.get_page(
                    object_type='deals',
                    object_id=deal_id,
                    to_object_type='contacts',
                    limit=10
                )
                if associations.results:
                    contact_ids = [str(assoc.to_object_id) for assoc in associations.results]
            except AttributeError:
                # Fallback: Use direct HTTP API call
                import requests
                url = f"https://api.hubapi.com/crm/v4/objects/deals/{deal_id}/associations/contacts"
                headers = {"Authorization": f"Bearer {HUBSPOT_ACCESS_TOKEN}"}
                response = requests.get(url, headers=headers, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    contact_ids = [str(r.get('toObjectId')) for r in data.get('results', [])][:10]
                elif response.status_code == 403:
                    logger.error(f"PERMISSION ERROR: Missing associations scope for deal {deal_id}")
                else:
                    logger.warning(f"HTTP {response.status_code} fetching associations for deal {deal_id}")

            if not contact_ids:
                return []

            logger.debug(f"Deal {deal_id}: Found {len(contact_ids)} associated contacts")

            # Fetch contact details with retry for each contact
            for contact_id in contact_ids:
                for contact_attempt in range(max_retries):
                    try:
                        contact = hubspot_client.crm.contacts.basic_api.get_by_id(
                            contact_id=contact_id,
                            properties=CONTACT_PROPERTIES
                        )

                        props = contact.properties
                        contacts.append({
                            'id': contact_id,
                            'firstname': props.get('firstname', ''),
                            'lastname': props.get('lastname', ''),
                            'name': f"{props.get('firstname', '')} {props.get('lastname', '')}".strip(),
                            'email': props.get('email', ''),
                            'phone': props.get('phone') or props.get('mobilephone', ''),
                            'jobtitle': props.get('jobtitle', ''),
                            'company': props.get('company', ''),
                            'lifecyclestage': props.get('lifecyclestage', ''),
                            'country': props.get('country', ''),
                            'city': props.get('city', ''),
                        })
                        break  # Success, exit retry loop
                    except ContactsApiException as e:
                        if e.status == 403:
                            logger.error(f"PERMISSION ERROR fetching contact {contact_id}: Missing 'crm.objects.contacts.read' scope. Error: {e}")
                            break  # Don't retry permission errors
                        else:
                            logger.warning(f"Could not fetch contact {contact_id}: {e}")
                            break  # Don't retry API errors
                    except (ConnectionError, TimeoutError, OSError) as e:
                        if contact_attempt < max_retries - 1:
                            wait_time = 2 ** contact_attempt
                            logger.warning(f"Network error fetching contact {contact_id}, retrying in {wait_time}s: {e}")
                            time.sleep(wait_time)
                        else:
                            logger.warning(f"Failed to fetch contact {contact_id} after {max_retries} attempts: {e}")
                    except Exception as e:
                        if 'SSL' in str(e) or 'EOF' in str(e) or 'connection' in str(e).lower():
                            if contact_attempt < max_retries - 1:
                                wait_time = 2 ** contact_attempt
                                logger.warning(f"Connection error fetching contact {contact_id}, retrying in {wait_time}s: {e}")
                                time.sleep(wait_time)
                            else:
                                logger.warning(f"Failed to fetch contact {contact_id} after {max_retries} attempts: {e}")
                        else:
                            logger.warning(f"Could not fetch contact {contact_id}: {e}")
                            break  # Don't retry unknown errors

            return contacts  # Success, exit main retry loop

        except (ConnectionError, TimeoutError, OSError) as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.warning(f"Network error for deal {deal_id}, retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
            else:
                logger.warning(f"Failed to fetch associations for deal {deal_id} after {max_retries} attempts: {e}")
        except Exception as e:
            error_msg = str(e)
            if '403' in error_msg or 'Forbidden' in error_msg:
                logger.error(f"PERMISSION ERROR fetching associations for deal {deal_id}: Check HubSpot scopes. Error: {e}")
                return contacts  # Don't retry permission errors
            elif 'SSL' in error_msg or 'EOF' in error_msg or 'connection' in error_msg.lower():
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Connection error for deal {deal_id}, retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    logger.warning(f"Failed to fetch associations for deal {deal_id} after {max_retries} attempts: {e}")
            else:
                logger.warning(f"Could not fetch associations for deal {deal_id}: {e}")
                return contacts  # Don't retry unknown errors

    return contacts


def fetch_associated_company(hubspot_client: HubSpot, deal_id: str) -> Dict:
    """Fetch associated company for a deal using HubSpot API."""
    try:
        company_id = None

        # Try using the associations v4 basic API (HubSpot SDK v9+)
        try:
            associations = hubspot_client.crm.associations.v4.basic_api.get_page(
                object_type='deals',
                object_id=deal_id,
                to_object_type='companies',
                limit=1
            )
            if associations.results:
                company_id = str(associations.results[0].to_object_id)
        except AttributeError:
            # Fallback: Use direct HTTP API call
            import requests
            url = f"https://api.hubapi.com/crm/v4/objects/deals/{deal_id}/associations/companies"
            headers = {"Authorization": f"Bearer {HUBSPOT_ACCESS_TOKEN}"}
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    company_id = str(results[0].get('toObjectId'))

        if not company_id:
            return {}

        company = hubspot_client.crm.companies.basic_api.get_by_id(
            company_id=company_id,
            properties=['name', 'domain', 'industry', 'country', 'city', 'annualrevenue', 'numberofemployees']
        )

        props = company.properties
        return {
            'id': company_id,
            'name': props.get('name', ''),
            'domain': props.get('domain', ''),
            'industry': props.get('industry', ''),
            'country': props.get('country', ''),
            'city': props.get('city', ''),
            'revenue': props.get('annualrevenue'),
            'employees': props.get('numberofemployees'),
        }

    except Exception as e:
        logger.debug(f"Could not fetch company for deal {deal_id}: {e}")
        return {}


def fetch_all_deals(hubspot_client: HubSpot, deal_properties: List[str], target_pipeline_id: Optional[str]) -> List[Any]:
    """Fetch all deals from HubSpot with pagination and rate limit handling."""
    all_deals = []
    after = None
    page_count = 0
    max_retries = 5

    logger.info("Starting to fetch deals from HubSpot...")
    if target_pipeline_id:
        logger.info(f"Filtering for pipeline: {TARGET_PIPELINE_NAME} (ID: {target_pipeline_id})")

    while True:
        page_count += 1
        retry_count = 0

        while retry_count < max_retries:
            try:
                response = hubspot_client.crm.deals.basic_api.get_page(
                    limit=100,
                    properties=deal_properties,
                    after=after
                )

                deals = response.results

                # Filter by pipeline if specified
                if target_pipeline_id:
                    deals = [d for d in deals if d.properties.get('pipeline') == target_pipeline_id]

                all_deals.extend(deals)

                logger.info(f"Page {page_count}: Fetched {len(response.results)} deals, {len(deals)} in target pipeline (Total: {len(all_deals)})")

                if response.paging and response.paging.next:
                    after = response.paging.next.after
                else:
                    logger.info(f"Completed fetching all deals. Total in '{TARGET_PIPELINE_NAME}': {len(all_deals)}")
                    return all_deals

                break

            except DealsApiException as e:
                retry_count += 1
                if e.status == 429:
                    wait_time = min(60, 10 * (2 ** retry_count))
                    logger.warning(f"Rate limited. Waiting {wait_time}s (retry {retry_count}/{max_retries})")
                    time.sleep(wait_time)
                elif retry_count >= max_retries:
                    logger.error(f"Failed after {max_retries} retries: {e}")
                    raise
                else:
                    logger.warning(f"API error (attempt {retry_count}/{max_retries}): {e}")
                    time.sleep(5)

            except Exception as e:
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Unexpected error: {e}")
                    raise
                time.sleep(5)

    return all_deals


def fetch_all_meetings(hubspot_client: HubSpot, owners_dict: Dict) -> List[Dict]:
    """Fetch all meetings from HubSpot using the Engagements API."""
    import requests

    all_meetings = []
    after = None
    page_count = 0

    logger.info("Fetching meetings from HubSpot...")

    # Meeting properties to fetch
    meeting_properties = [
        'hs_meeting_title',
        'hs_meeting_outcome',
        'hs_meeting_start_time',
        'hs_meeting_end_time',
        'hs_timestamp',
        'hs_meeting_body',
        'hs_internal_meeting_notes',
        'hs_meeting_location',
        'hs_meeting_external_url',
        'hubspot_owner_id',
        'hs_createdate',
        'hs_lastmodifieddate',
        # Created by fields (who actually booked the meeting)
        'hs_created_by_user_id',
        'hs_meeting_source',
    ]

    while True:
        page_count += 1

        try:
            # Use CRM objects API for meetings
            url = "https://api.hubapi.com/crm/v3/objects/meetings"
            headers = {"Authorization": f"Bearer {HUBSPOT_ACCESS_TOKEN}"}
            params = {
                "limit": 100,
                "properties": ",".join(meeting_properties),
            }
            if after:
                params["after"] = after

            response = requests.get(url, headers=headers, params=params)

            if response.status_code == 200:
                data = response.json()
                meetings = data.get('results', [])

                logger.info(f"Page {page_count}: Fetched {len(meetings)} meetings (Total: {len(all_meetings) + len(meetings)})")

                for meeting in meetings:
                    props = meeting.get('properties', {})
                    meeting_id = meeting.get('id', '')

                    # Get owner info (who the meeting is assigned to)
                    owner_id = str(props.get('hubspot_owner_id') or '')
                    owner_name = ''
                    owner_email = ''
                    if owner_id and owner_id in owners_dict:
                        owner_name = owners_dict[owner_id].get('name', '')
                        owner_email = owners_dict[owner_id].get('email', '')

                    # Get created_by info (who actually booked/created the meeting - this is the SDR)
                    created_by_user_id = str(props.get('hs_created_by_user_id') or '')
                    created_by_name = ''
                    created_by_email = ''
                    if created_by_user_id and created_by_user_id in owners_dict:
                        created_by_name = owners_dict[created_by_user_id].get('name', '')
                        created_by_email = owners_dict[created_by_user_id].get('email', '')

                    # Meeting source (e.g., CRM_UI, MEETINGS, etc.)
                    meeting_source = props.get('hs_meeting_source', '')

                    # Calculate duration
                    start_time = props.get('hs_meeting_start_time')
                    end_time = props.get('hs_meeting_end_time')
                    duration_minutes = None
                    if start_time and end_time:
                        start_dt = parse_timestamp_to_datetime(start_time)
                        end_dt = parse_timestamp_to_datetime(end_time)
                        if start_dt and end_dt:
                            duration_minutes = int((end_dt - start_dt).total_seconds() / 60)

                    all_meetings.append({
                        'meeting_id': meeting_id,
                        'title': props.get('hs_meeting_title', ''),
                        'meeting_type': 'MEETING',
                        'meeting_outcome': props.get('hs_meeting_outcome', ''),
                        'start_time': convert_hubspot_timestamp(start_time),
                        'end_time': convert_hubspot_timestamp(end_time),
                        'created_at': convert_hubspot_timestamp(props.get('hs_createdate')),
                        'updated_at': convert_hubspot_timestamp(props.get('hs_lastmodifieddate')),
                        'duration_minutes': duration_minutes,
                        'owner_id': owner_id,
                        'owner_name': owner_name,
                        'owner_email': owner_email,
                        'created_by_user_id': created_by_user_id,
                        'created_by_name': created_by_name,
                        'created_by_email': created_by_email,
                        'meeting_source': meeting_source,
                        'body': props.get('hs_meeting_body', ''),
                        'internal_notes': props.get('hs_internal_meeting_notes', ''),
                        'location': props.get('hs_meeting_location', ''),
                        'meeting_link': props.get('hs_meeting_external_url', ''),
                    })

                # Check for next page
                paging = data.get('paging', {})
                if paging and paging.get('next'):
                    after = paging['next'].get('after')
                else:
                    break

            elif response.status_code == 403:
                logger.error("PERMISSION ERROR: Missing 'crm.objects.meetings.read' scope")
                break
            else:
                logger.error(f"Error fetching meetings: HTTP {response.status_code}")
                break

        except Exception as e:
            logger.error(f"Error fetching meetings: {e}")
            break

    logger.info(f"Total meetings fetched: {len(all_meetings)}")
    return all_meetings


def fetch_meeting_associations(meeting_id: str) -> Dict:
    """Fetch associations for a meeting (deals, contacts, companies)."""
    import requests

    associations = {
        'deal_ids': [],
        'contact_ids': [],
        'company_ids': []
    }

    headers = {"Authorization": f"Bearer {HUBSPOT_ACCESS_TOKEN}"}

    # Fetch deal associations
    try:
        url = f"https://api.hubapi.com/crm/v4/objects/meetings/{meeting_id}/associations/deals"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            associations['deal_ids'] = [str(r.get('toObjectId')) for r in data.get('results', [])]
    except:
        pass

    # Fetch contact associations
    try:
        url = f"https://api.hubapi.com/crm/v4/objects/meetings/{meeting_id}/associations/contacts"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            associations['contact_ids'] = [str(r.get('toObjectId')) for r in data.get('results', [])]
    except:
        pass

    # Fetch company associations
    try:
        url = f"https://api.hubapi.com/crm/v4/objects/meetings/{meeting_id}/associations/companies"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            associations['company_ids'] = [str(r.get('toObjectId')) for r in data.get('results', [])]
    except:
        pass

    return associations


def transform_meetings(meetings: List[Dict], snapshot_timestamp: datetime) -> pd.DataFrame:
    """Transform meetings into DataFrame for BigQuery."""
    logger.info(f"Transforming {len(meetings)} meetings...")

    snapshot_iso = snapshot_timestamp.isoformat()
    snapshot_date = snapshot_timestamp.date().isoformat()

    records = []
    for idx, meeting in enumerate(meetings):
        if idx % 50 == 0 and idx > 0:
            logger.info(f"Processing meeting {idx}/{len(meetings)}...")

        # Fetch associations (rate limited)
        associations = fetch_meeting_associations(meeting['meeting_id'])

        record = {
            'meeting_id': meeting['meeting_id'],
            'title': meeting['title'],
            'meeting_type': meeting['meeting_type'],
            'meeting_outcome': meeting['meeting_outcome'],
            'start_time': meeting['start_time'],
            'end_time': meeting['end_time'],
            'created_at': meeting['created_at'],
            'updated_at': meeting['updated_at'],
            'duration_minutes': meeting['duration_minutes'],
            'owner_id': meeting['owner_id'],
            'owner_name': meeting['owner_name'],
            'owner_email': meeting['owner_email'],
            # Created by fields (who actually booked the meeting - the SDR)
            'created_by_user_id': meeting.get('created_by_user_id', ''),
            'created_by_name': meeting.get('created_by_name', ''),
            'created_by_email': meeting.get('created_by_email', ''),
            'meeting_source': meeting.get('meeting_source', ''),
            'associated_deal_ids': ','.join(associations['deal_ids']) if associations['deal_ids'] else None,
            'associated_contact_ids': ','.join(associations['contact_ids']) if associations['contact_ids'] else None,
            'associated_company_ids': ','.join(associations['company_ids']) if associations['company_ids'] else None,
            'body': meeting['body'],
            'internal_notes': meeting['internal_notes'],
            'location': meeting['location'],
            'meeting_link': meeting['meeting_link'],
            'snapshot_timestamp': snapshot_iso,
            'snapshot_date': snapshot_date,
        }
        records.append(record)

        # Small delay to avoid rate limiting
        if idx % 10 == 0:
            time.sleep(0.05)

    df = pd.DataFrame(records)
    logger.info(f"Meetings transformation complete. DataFrame shape: {df.shape}")
    return df


def load_meetings_to_bigquery(df: pd.DataFrame, project_id: str, dataset_id: str) -> int:
    """Load meetings DataFrame to BigQuery."""
    if df.empty:
        logger.warning("Meetings DataFrame is empty. No data to load.")
        return 0

    table_id = "meetings_snapshots"
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset_id}.{table_id}"

    logger.info(f"Loading {len(df)} meetings to BigQuery table: {table_ref}")

    try:
        # Ensure table exists
        try:
            client.get_table(table_ref)
            logger.info(f"Table {table_ref} already exists")
        except Exception:
            logger.info(f"Creating table {table_ref}...")
            table = bigquery.Table(table_ref, schema=MEETINGS_SCHEMA)
            table.time_partitioning = bigquery.TimePartitioning(
                type_=bigquery.TimePartitioningType.DAY,
                field="snapshot_date"
            )
            table.clustering_fields = ["owner_name", "meeting_outcome"]
            client.create_table(table)
            logger.info(f"Created table {table_ref}")

        # Delete existing data for today's snapshot
        snapshot_date = df['snapshot_date'].iloc[0] if 'snapshot_date' in df.columns else None
        if snapshot_date:
            delete_query = f"""
                DELETE FROM `{table_ref}`
                WHERE snapshot_date = '{snapshot_date}'
            """
            logger.info(f"Deleting existing meetings for snapshot_date: {snapshot_date}")
            delete_job = client.query(delete_query)
            delete_job.result()

        # Load new data
        job_config = bigquery.LoadJobConfig(
            schema=MEETINGS_SCHEMA,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            source_format=bigquery.SourceFormat.PARQUET,
        )

        job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result()

        logger.info(f"Successfully loaded {job.output_rows} meetings to {table_ref}")
        return job.output_rows

    except GoogleAPIError as e:
        logger.error(f"BigQuery API error loading meetings: {e}")
        raise


def safe_float(value: Any) -> Optional[float]:
    """Safely convert a value to float."""
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def safe_int(value: Any) -> Optional[int]:
    """Safely convert a value to int."""
    if value is None or value == '':
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def calculate_deal_age_status(days_in_stage: Optional[int], dealstage: str) -> str:
    """Calculate deal age status based on days in current stage.

    Uses days_in_current_stage for accurate stage-based aging.
    Thresholds represent how long a deal should stay in each stage.
    """
    if days_in_stage is None:
        return 'Unknown'

    stage_lower = (dealstage or '').lower()

    # Stalled/Delayed deals - always concerning
    if 'stalled' in stage_lower or 'delayed' in stage_lower:
        if days_in_stage <= 14:
            return 'Yellow'
        else:
            return 'Red'

    # Early stages: NBM Scheduled, Discovery, Lead, Qualification
    # Should move quickly - max 14 days
    if any(s in stage_lower for s in ['nbm', 'discovery', 'qualification', 'prospecting', 'lead', 'scheduled']):
        if days_in_stage <= 14:
            return 'Green'
        elif days_in_stage <= 30:
            return 'Yellow'
        else:
            return 'Red'

    # Mid stages: Technical Evaluation, Demo, Proposal
    # More time needed - max 30 days
    elif any(s in stage_lower for s in ['technical', 'evaluation', 'demo', 'proposal']):
        if days_in_stage <= 30:
            return 'Green'
        elif days_in_stage <= 45:
            return 'Yellow'
        else:
            return 'Red'

    # Late stages: Negotiation, Contract, Closing
    # Can take longer - max 45 days
    elif any(s in stage_lower for s in ['negotiation', 'contract', 'closing', 'final']):
        if days_in_stage <= 45:
            return 'Green'
        elif days_in_stage <= 60:
            return 'Yellow'
        else:
            return 'Red'

    # Default thresholds for unknown stages
    else:
        if days_in_stage <= 21:
            return 'Green'
        elif days_in_stage <= 45:
            return 'Yellow'
        else:
            return 'Red'


def transform_deals(
    hubspot_client: HubSpot,
    deals: List[Any],
    snapshot_timestamp: datetime,
    pipelines_dict: Dict,
    stages_dict: Dict,
    owners_dict: Dict
) -> pd.DataFrame:
    """Transform HubSpot deal objects into enriched DataFrame with contacts."""
    logger.info(f"Transforming {len(deals)} deals with associated contacts...")

    snapshot_iso = snapshot_timestamp.isoformat()
    snapshot_date = snapshot_timestamp.date().isoformat()

    # Track contact fetching stats
    deals_with_contacts = 0
    total_contacts_fetched = 0

    records = []
    for idx, deal in enumerate(deals):
        if idx % 20 == 0:
            logger.info(f"Processing deal {idx + 1}/{len(deals)}...")

        props = deal.properties
        deal_id = str(props.get('hs_object_id', ''))

        # Get pipeline and stage labels
        pipeline_id = props.get('pipeline') or ''
        dealstage_id = props.get('dealstage') or ''

        pipeline_label = ''
        dealstage_label = ''

        if pipeline_id and pipeline_id in pipelines_dict:
            pipeline_label = pipelines_dict[pipeline_id].get('label', '')
            if dealstage_id in pipelines_dict[pipeline_id].get('stages', {}):
                dealstage_label = pipelines_dict[pipeline_id]['stages'][dealstage_id]

        if not dealstage_label and dealstage_id in stages_dict:
            dealstage_label = stages_dict[dealstage_id].get('label', '')

        # Get owner info
        owner_id = str(props.get('hubspot_owner_id') or '')
        owner_name = ''
        owner_email = ''

        if owner_id and owner_id in owners_dict:
            owner_name = owners_dict[owner_id].get('name', '')
            owner_email = owners_dict[owner_id].get('email', '')
        elif owner_id:
            logger.warning(f"Owner ID {owner_id} not found in owners_dict. Available: {list(owners_dict.keys())[:10]}")

        # Fetch associated contacts
        contacts = fetch_associated_contacts(hubspot_client, deal_id)
        primary_contact = contacts[0] if contacts else {}

        # Track contact stats
        if contacts:
            deals_with_contacts += 1
            total_contacts_fetched += len(contacts)

        # Fetch associated company
        company = fetch_associated_company(hubspot_client, deal_id)

        # Parse dates for calculations
        createdate_dt = parse_timestamp_to_datetime(props.get('createdate'))
        closedate_dt = parse_timestamp_to_datetime(props.get('closedate'))
        lastmodified_dt = parse_timestamp_to_datetime(props.get('hs_lastmodifieddate'))

        # Calculate days metrics
        days_since_created = None
        if createdate_dt:
            days_since_created = (snapshot_timestamp - createdate_dt).days

        # Calculate days in current stage using HubSpot's stage entry date
        # HubSpot stores this as hs_date_entered_<stage_id>
        days_in_current_stage = None
        stage_entered_date = None

        if dealstage_id:
            # Try to find the stage entry date property
            stage_date_prop = f'hs_date_entered_{dealstage_id}'
            stage_entered_str = props.get(stage_date_prop)

            if stage_entered_str:
                stage_entered_date = parse_timestamp_to_datetime(stage_entered_str)
                if stage_entered_date:
                    days_in_current_stage = (snapshot_timestamp - stage_entered_date).days
                    logger.debug(f"Deal {deal_id}: Stage {dealstage_id} entered on {stage_entered_str}, {days_in_current_stage} days ago")

        # Fallback to days since created if stage entry date not found
        if days_in_current_stage is None:
            days_in_current_stage = days_since_created
            logger.debug(f"Deal {deal_id}: Using days_since_created ({days_since_created}) as fallback for days_in_current_stage")

        days_to_close = None
        if closedate_dt:
            days_to_close = (closedate_dt - snapshot_timestamp).days

        # Determine deal status
        stage_lower = dealstage_label.lower() if dealstage_label else ''
        is_won = 'won' in stage_lower or 'closed won' in stage_lower
        is_lost = 'lost' in stage_lower or 'closed lost' in stage_lower
        is_open = not is_won and not is_lost

        # Calculate weighted amount
        # Note: HubSpot stores probability as decimal (0.1 = 10%, 0.5 = 50%)
        amount = safe_float(props.get('amount'))
        probability = safe_float(props.get('hs_deal_stage_probability'))
        weighted_amount = None
        if amount is not None and probability is not None:
            weighted_amount = amount * probability

        # Calculate deal age status (based on days in current stage)
        deal_age_status = calculate_deal_age_status(days_in_current_stage, dealstage_label)

        # Store all properties as JSON
        all_props_json = json.dumps({k: v for k, v in props.items() if v is not None}, default=str)

        record = {
            # Core identifiers
            'hs_object_id': deal_id,
            'dealname': props.get('dealname'),
            'dealtype': props.get('dealtype'),

            # Financial
            'amount': amount,
            'deal_currency_code': props.get('deal_currency_code'),
            'hs_tcv': safe_float(props.get('hs_tcv')),
            'hs_acv': safe_float(props.get('hs_acv')),
            'hs_arr': safe_float(props.get('hs_arr')),
            'hs_mrr': safe_float(props.get('hs_mrr')),

            # Pipeline & Stage
            'dealstage': dealstage_id,
            'dealstage_label': dealstage_label,
            'pipeline': pipeline_id,
            'pipeline_label': pipeline_label,
            'hs_deal_stage_probability': probability,

            # Dates
            'closedate': convert_hubspot_timestamp(props.get('closedate')),
            'createdate': convert_hubspot_timestamp(props.get('createdate')),
            'hs_lastmodifieddate': convert_hubspot_timestamp(props.get('hs_lastmodifieddate')),
            'notes_last_updated': convert_hubspot_timestamp(props.get('notes_last_updated')),
            'notes_last_contacted': convert_hubspot_timestamp(props.get('notes_last_contacted')),
            'hs_date_entered_closedwon': convert_hubspot_timestamp(props.get('hs_date_entered_closedwon')),
            'hs_date_entered_closedlost': convert_hubspot_timestamp(props.get('hs_date_entered_closedlost')),

            # Owner
            'hubspot_owner_id': owner_id,
            'owner_name': owner_name,
            'owner_email': owner_email,

            # Forecasting
            'hs_forecast_category': props.get('hs_forecast_category'),
            'hs_forecast_probability': safe_float(props.get('hs_forecast_probability')),
            'hs_manual_forecast_category': props.get('hs_manual_forecast_category'),
            'hs_priority': props.get('hs_priority'),
            'hs_next_step': props.get('hs_next_step'),

            # Activity & Engagement
            'num_associated_contacts': safe_int(props.get('num_associated_contacts')),
            'num_contacted_notes': safe_int(props.get('num_contacted_notes')),
            'num_notes': safe_int(props.get('num_notes')),
            'engagements_last_meeting_booked': convert_hubspot_timestamp(props.get('engagements_last_meeting_booked')),
            'hs_latest_meeting_activity': convert_hubspot_timestamp(props.get('hs_latest_meeting_activity')),
            'hs_sales_email_last_replied': convert_hubspot_timestamp(props.get('hs_sales_email_last_replied')),

            # Win/Loss
            'closed_lost_reason': props.get('closed_lost_reason'),
            'closed_won_reason': props.get('closed_won_reason'),

            # All properties as JSON
            'description': props.get('description'),
            'all_properties_json': all_props_json,

            # Associated Contacts
            'contact_count': len(contacts),
            'primary_contact_id': primary_contact.get('id', ''),
            'primary_contact_name': primary_contact.get('name', ''),
            'primary_contact_email': primary_contact.get('email', ''),
            'primary_contact_phone': primary_contact.get('phone', ''),
            'primary_contact_jobtitle': primary_contact.get('jobtitle', ''),
            'primary_contact_company': primary_contact.get('company', ''),
            'all_contacts_json': json.dumps(contacts) if contacts else None,

            # Associated Company
            'company_id': company.get('id', ''),
            'company_name': company.get('name', ''),
            'company_domain': company.get('domain', ''),
            'company_industry': company.get('industry', ''),
            'company_country': company.get('country', ''),
            'company_city': company.get('city', ''),
            'company_revenue': safe_float(company.get('revenue')),
            'company_employees': safe_int(company.get('employees')),

            # Calculated fields
            'days_in_current_stage': days_in_current_stage,
            'days_since_created': days_since_created,
            'days_to_close': days_to_close,
            'weighted_amount': weighted_amount,
            'is_open': is_open,
            'is_won': is_won,
            'is_lost': is_lost,
            'deal_age_status': deal_age_status,

            # Snapshot metadata
            'snapshot_timestamp': snapshot_iso,
            'snapshot_date': snapshot_date
        }
        records.append(record)

        # Small delay to avoid rate limiting when fetching associations
        if idx % 10 == 0:
            time.sleep(0.1)

    df = pd.DataFrame(records)
    df['hs_object_id'] = df['hs_object_id'].astype(str)

    logger.info(f"Transformation complete. DataFrame shape: {df.shape}")
    logger.info(f"Contact stats: {deals_with_contacts}/{len(deals)} deals have contacts, {total_contacts_fetched} total contacts fetched")
    if deals_with_contacts == 0:
        logger.warning("WARNING: No contacts were fetched for ANY deal. Check HubSpot Private App scopes!")
        logger.warning("Required scopes: crm.objects.contacts.read, crm.schemas.contacts.read")
    return df


def load_to_bigquery(df: pd.DataFrame, project_id: str, dataset_id: str, table_id: str) -> int:
    """Load DataFrame to BigQuery, replacing any existing data for today's snapshot."""
    if df.empty:
        logger.warning("DataFrame is empty. No data to load.")
        return 0

    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset_id}.{table_id}"

    logger.info(f"Loading {len(df)} rows to BigQuery table: {table_ref}")

    try:
        ensure_table_exists(client, project_id, dataset_id, table_id)

        # Delete existing data for today's snapshot to avoid duplicates
        snapshot_date = df['snapshot_date'].iloc[0] if 'snapshot_date' in df.columns else None
        if snapshot_date:
            delete_query = f"""
                DELETE FROM `{table_ref}`
                WHERE snapshot_date = '{snapshot_date}'
            """
            logger.info(f"Deleting existing data for snapshot_date: {snapshot_date}")
            delete_job = client.query(delete_query)
            delete_job.result()
            logger.info(f"Deleted {delete_job.num_dml_affected_rows} existing rows for {snapshot_date}")

        # Load new data
        job_config = bigquery.LoadJobConfig(
            schema=BIGQUERY_SCHEMA,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            source_format=bigquery.SourceFormat.PARQUET,
        )

        job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result()

        logger.info(f"Successfully loaded {job.output_rows} rows to {table_ref}")
        return job.output_rows

    except GoogleAPIError as e:
        logger.error(f"BigQuery API error: {e}")
        raise


def ensure_table_exists(client: bigquery.Client, project_id: str, dataset_id: str, table_id: str):
    """Ensure the BigQuery table exists with proper partitioning."""
    table_ref = f"{project_id}.{dataset_id}.{table_id}"

    try:
        client.get_table(table_ref)
        logger.info(f"Table {table_ref} already exists")
    except Exception:
        logger.info(f"Creating table {table_ref}...")

        dataset_ref = f"{project_id}.{dataset_id}"
        try:
            client.get_dataset(dataset_ref)
        except Exception:
            logger.info(f"Creating dataset {dataset_ref}...")
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            client.create_dataset(dataset, exists_ok=True)

        table = bigquery.Table(table_ref, schema=BIGQUERY_SCHEMA)
        table.time_partitioning = bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field="snapshot_date"
        )
        table.clustering_fields = ["pipeline_label", "owner_name", "is_open"]
        client.create_table(table)
        logger.info(f"Created table {table_ref} with partitioning and clustering")


def validate_environment():
    """Validate required environment variables."""
    required_vars = {
        'PROJECT_ID': PROJECT_ID,
        'DATASET_ID': DATASET_ID,
        'TABLE_ID': TABLE_ID,
        'HUBSPOT_ACCESS_TOKEN': HUBSPOT_ACCESS_TOKEN
    }

    missing = [var for var, value in required_vars.items() if not value]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    logger.info("Environment validation passed")


def hubspot_to_bigquery_etl(event, context):
    """Main Cloud Function entry point."""
    start_time = datetime.now(timezone.utc)

    logger.info("=" * 70)
    logger.info("HubSpot to BigQuery ETL Pipeline - CEO Metrics Suite v4.0")
    logger.info(f"Target Pipeline: {TARGET_PIPELINE_NAME}")
    logger.info(f"Snapshot Timestamp: {start_time.isoformat()}")
    logger.info("=" * 70)

    try:
        validate_environment()

        logger.info("Initializing HubSpot client...")
        hubspot_client = HubSpot(access_token=HUBSPOT_ACCESS_TOKEN)

        # Fetch all available deal properties
        deal_properties = fetch_all_deal_properties(hubspot_client)

        # Fetch reference data and get target pipeline ID
        pipelines_dict, stages_dict, target_pipeline_id = fetch_pipelines(hubspot_client)
        owners_dict = fetch_owners(hubspot_client)

        # Fetch all deals (filtered by pipeline)
        deals = fetch_all_deals(hubspot_client, deal_properties, target_pipeline_id)

        if not deals:
            logger.warning(f"No deals found in pipeline '{TARGET_PIPELINE_NAME}'")
            return {
                'status': 'success',
                'message': f'No deals found in pipeline {TARGET_PIPELINE_NAME}',
                'deals_extracted': 0,
                'rows_loaded': 0
            }

        # Transform with enriched data and contacts
        df = transform_deals(hubspot_client, deals, start_time, pipelines_dict, stages_dict, owners_dict)

        # Load to BigQuery
        rows_loaded = load_to_bigquery(df, PROJECT_ID, DATASET_ID, TABLE_ID)

        # Fetch and load meetings
        logger.info("=" * 50)
        logger.info("Starting Meetings ETL...")
        meetings = fetch_all_meetings(hubspot_client, owners_dict)
        meetings_loaded = 0
        if meetings:
            meetings_df = transform_meetings(meetings, start_time)
            meetings_loaded = load_meetings_to_bigquery(meetings_df, PROJECT_ID, DATASET_ID)
        logger.info(f"Meetings ETL complete: {meetings_loaded} meetings loaded")

        end_time = datetime.now(timezone.utc)
        execution_time = (end_time - start_time).total_seconds()

        # Calculate summary stats
        open_deals = df[df['is_open'] == True].shape[0]
        total_pipeline = df[df['is_open'] == True]['amount'].sum()
        weighted_pipeline = df[df['is_open'] == True]['weighted_amount'].sum()

        result = {
            'status': 'success',
            'message': f'ETL pipeline completed for {TARGET_PIPELINE_NAME}',
            'pipeline_name': TARGET_PIPELINE_NAME,
            'deals_extracted': len(deals),
            'rows_loaded': rows_loaded,
            'meetings_extracted': len(meetings) if meetings else 0,
            'meetings_loaded': meetings_loaded,
            'open_deals': open_deals,
            'total_pipeline_value': total_pipeline,
            'weighted_pipeline_value': weighted_pipeline,
            'pipelines_fetched': len(pipelines_dict),
            'owners_fetched': len(owners_dict),
            'snapshot_timestamp': start_time.isoformat(),
            'execution_time_seconds': execution_time
        }

        logger.info("=" * 70)
        logger.info("ETL Pipeline Completed Successfully")
        logger.info(f"Pipeline: {TARGET_PIPELINE_NAME}")
        logger.info(f"Deals Extracted: {len(deals)} | Open: {open_deals}")
        logger.info(f"Total Pipeline: ${total_pipeline:,.2f} | Weighted: ${weighted_pipeline:,.2f}")
        logger.info(f"Execution Time: {execution_time:.2f} seconds")
        logger.info("=" * 70)

        return result

    except Exception as e:
        logger.error(f"ETL pipeline failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'status': 'error',
            'message': str(e),
            'snapshot_timestamp': start_time.isoformat()
        }


if __name__ == "__main__":
    result = hubspot_to_bigquery_etl(None, None)
    print(result)
