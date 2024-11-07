import googlemaps
import pandas as pd
import time
import sys
import signal
from geopy.geocoders import Nominatim 
from geopy.exc import GeocoderTimedOut
from opencage.geocoder import OpenCageGeocode

# Replace with your API keys
GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'
LOCATIONIQ_API_KEY = 'pk.0518cf5cac8ba6466c845ba682153527'
OPENCAGE_API_KEY = '5a806ee3b6e54380aa589df01c662404'

# Initialize the Google Maps, LocationIQ, and OpenCage clients
# gmaps = googlemaps.Client(key=GOOGLE_API_KEY)
nominatim = Nominatim(user_agent="nj_biz_geocode") 
opencage = OpenCageGeocode(OPENCAGE_API_KEY)

if len(sys.argv) != 2:
    print("Usage: python geocode_script.py <file_path>")
    sys.exit(1)

# Get the file path from the command-line argument
file_path = sys.argv[1]

# Load the CSV file
# file_path = '/Users/ryangravener/Downloads/Data - Data.csv'
df = pd.read_csv(file_path, dtype={'addr_zipcode': str})

def fix_zipcode(zipcode):
    # Convert to string if it's a number (like a float or int)
    zipcode_str = str(int(zipcode))  # Convert to int first to remove decimal, then to string
    
    # Pad with leading zeros to ensure a 5-digit format
    fixed_zipcode = zipcode_str.zfill(5)
    
    return fixed_zipcode

# Combine the address components into a full address
df['full_address'] = (
    df['addr_line_1'].fillna('') + ', ' + 
    df['addr_city'].fillna('') + ', ' + 
    df['addr_state'].fillna('')
    # // + ', ' +# fix_zipcode(df['addr_zipcode'])
)

# Ensure latitude and longitude columns exist
if 'latitude' not in df.columns:
    df['latitude'] = None
if 'longitude' not in df.columns:
    df['longitude'] = None
if 'latitude_alt' not in df.columns:
    df['latitude_alt'] = None
    df['longitude_alt'] = None

def signal_handler(signum, frame):
    print("Signal received, but processing is blocked in the current code block.")


# Function to get latitude and longitude using Google Maps API
def get_lat_lng_google(address):
    try:
        geocode_result = gmaps.geocode(address)
        if geocode_result:
            location = geocode_result[0]['geometry']['location']
            return location['lat'], location['lng']
    except Exception as e:
        print(f"Google Maps geocoding error: {e}")
    return None, None

# Function to get latitude and longitude using LocationIQ
def get_lat_lng_locationiq(address):
    try:
        location = nominatim.geocode(address, timeout=10)
        if location:
            return location.latitude, location.longitude
    except GeocoderTimedOut:
        print("Nominatim geocoder timed out. Retrying...")
        time.sleep(1)
        return get_lat_lng_nominatim(address)  # Retry once on timeout
    except Exception as e:
        print(f"Nominatim geocoding error: {e}")
    return None, None

# Function to get latitude and longitude using OpenCage
def get_lat_lng_opencage(address):
    try:
        result = opencage.geocode(address)
        if result:
            location = result[0]['geometry']
            return location['lat'], location['lng']
    except Exception as e:
        print(f"OpenCage geocoding error: {e}")
    return None, None




# Iterate over each row in the dataframe, alternating geocoders
count = 0
size = len(df)
for index, row in df.iterrows():
    if pd.isnull(row['addr_city']):
        print('Skipping ' + row['full_name'] + ', no address')
        continue
    if pd.isnull(row['latitude_alt']) == False:
        continue
    # Check if latitude and longitude already exist
    if pd.isnull(row['latitude']) or pd.isnull(row['longitude']):
        # Alternate between geocoders
        # if index % 3 == 0:
        #     lat, lng = get_lat_lng_google(row['full_address'])
        #     print(f"Using Google Maps for index {index}")
    # if index % 2 == 1:
        address = row['full_address']
        alternate = False
        lat, lng = get_lat_lng_locationiq(address)
        # if lat == None:
        #     lat, lng = get_lat_lng_location(row['full_address'])
        #     alternate = True
        if lat == None:
            address = row['addr_city']+", " + row['addr_state']
            alternate = True
            lat, lng = get_lat_lng_locationiq(address)
            print(f"Nominatim for alternate {address} {index} {lat},{lng}")
        else:
            print(f"Nominatim for {address} {index} {lat},{lng}")
        # else:
            # lat, lng = get_lat_lng_opencage(row['full_address'])
            # print(f"OpenCage for {row['full_address']} {index} {lat},{lng}")
        
        # Set the latitude and longitude in the DataFrame
        if alternate:
            df.at[index, 'latitude_alt'] = lat
            df.at[index, 'longitude_alt'] = lng
        else:
            df.at[index, 'latitude'] = lat
            df.at[index, 'longitude'] = lng
        count+=1
        # Save the updated dataframe to CSV after each iteration
        if count % 25 == 0 or count==size:
            original_handler = signal.getsignal(signal.SIGINT)
            signal.signal(signal.SIGINT, signal_handler)
            try:
                df.to_csv(file_path, index=False)
            finally:
                signal.signal(signal.SIGINT, original_handler)
        # Sleep for a short period to avoid hitting API rate limits
        time.sleep(.05)  # Adjust the delay as needed

print("Geocoding complete! Saved to CSV.")
