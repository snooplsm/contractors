import pandas as pd
import psycopg2
from psycopg2 import sql
import argparse

# Database connection settings
db_config = {
    'dbname': 'test',
    'host': 'localhost',
    'port': '5432'
}

def format_zipcode(value):
    try:
        # Convert the value to an integer to remove any decimal points
        zip_int = int(float(value))
        
        # Convert to a string and pad with leading zeros to ensure at least 5 digits
        zip_str = str(zip_int).zfill(5)
        
        # If the result has more than 5 digits, take only the first 5
        return zip_str[:5]
    except (ValueError, TypeError):
        # Return None if conversion fails (e.g., non-numeric input)
        return None

# Set up argument parsing to take file_path as an argument
parser = argparse.ArgumentParser(description="Insert data from a CSV file into PostgreSQL")
parser.add_argument("file_path", help="Path to the CSV file")
args = parser.parse_args()

# Load the CSV into a DataFrame
df = pd.read_csv(
    args.file_path, 
    dtype={'first_name': str, 'last_name': str, 'middle_name': str, 'name_suffix': str}, 
    converters={'addr_zipcode': lambda x: format_zipcode(x)}  # Force ZIP code as string, adding leading zeros if necessary
)

# Fill null values in latitude and longitude with latitude_alt and longitude_alt, respectively
df['latitude'] = df['latitude'].fillna(df['latitude_alt'])
df['longitude'] = df['longitude'].fillna(df['longitude_alt'])

# Replace remaining NaNs with None for compatibility with SQL NULL
df = df.where(pd.notnull(df), None)

try:
    # Attempt to connect to the database
    conn = psycopg2.connect(**db_config)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print("Connection failed:", e)

# Connect to the PostgreSQL database
conn = psycopg2.connect(**db_config)
cur = conn.cursor()

# Define the INSERT statement
insert_query = sql.SQL("""
    INSERT INTO contractor_data (
        full_name, first_name, middle_name, last_name, name_suffix,
        profession_name, license_type_name, license_no, issue_date,
        expiration_date, addr_line_1, addr_line_2, addr_city,
        addr_state, addr_zipcode, addr_county, addr_email,
        license_status_name, location
    ) VALUES (
        %(full_name)s, %(first_name)s, %(middle_name)s, %(last_name)s, %(name_suffix)s,
        %(profession_name)s, %(license_type_name)s, %(license_no)s, %(issue_date)s,
        %(expiration_date)s, %(addr_line_1)s, %(addr_line_2)s, %(addr_city)s,
        %(addr_state)s, %(addr_zipcode)s, %(addr_county)s, %(addr_email)s,
        %(license_status_name)s,
        CASE
            WHEN %(longitude)s IS NULL OR %(latitude)s IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326)
        END
    )
    ON CONFLICT (license_no)
    DO UPDATE SET
        full_name = EXCLUDED.full_name,
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        last_name = EXCLUDED.last_name,
        name_suffix = EXCLUDED.name_suffix,
        profession_name = EXCLUDED.profession_name,
        license_type_name = EXCLUDED.license_type_name,
        issue_date = EXCLUDED.issue_date,
        expiration_date = EXCLUDED.expiration_date,
        addr_line_1 = EXCLUDED.addr_line_1,
        addr_line_2 = EXCLUDED.addr_line_2,
        addr_city = EXCLUDED.addr_city,
        addr_state = EXCLUDED.addr_state,
        addr_zipcode = EXCLUDED.addr_zipcode,
        addr_county = EXCLUDED.addr_county,
        addr_email = EXCLUDED.addr_email,
        license_status_name = EXCLUDED.license_status_name,
        location = EXCLUDED.location;
""")

# Iterate over DataFrame rows and insert data into the table
for _, row in df.iterrows():
    data = row.to_dict()
    print(data['expiration_date'], data['addr_zipcode'])
    # Execute the insert query
    cur.execute(insert_query, data)

# Commit and close the connection
conn.commit()
cur.close()
conn.close()

print("Data successfully inserted into contractor_data table.")