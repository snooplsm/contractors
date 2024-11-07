import pandas as pd
import sys
import os

def format_postal_code(postal_code):
    # Check if postal_code is a float, then cast it to an integer and then to string
    if isinstance(postal_code, float):
        postal_code = str(int(postal_code))
    else:
        postal_code = str(postal_code).strip()  # Strip any whitespace from string input

    # If the postal code has a hyphen (e.g., ZIP+4 format), handle each part separately
    if '-' in postal_code:
        parts = postal_code.split('-')
        parts[0] = parts[0].zfill(5)  # Ensure leading zeros on the main ZIP part
        return '-'.join(parts)
    else:
        # Standard ZIP: Add leading zeros if the length is less than 5
        return postal_code.zfill(5)

def merge_files(file1, file2, output_file):
    # Expand paths to handle cases like '~' in paths
    file1 = os.path.expanduser(file1)
    file2 = os.path.expanduser(file2)
    
    # Read the two files
    print('file 1')
    df1 = pd.read_csv(file1,
    usecols=lambda col: not col.startswith('Unnamed'),
    na_filter=False,dtype={'first_name': str, 'last_name': str, 'middle_name': str, 'name_suffix': str, 'license_no': str, 'latitude': str, 'longitude': str, 'latitude_alt': str, 'longitude_alt': str})
    print('file 2')
    df2 = pd.read_csv(file2)  # using pipe delimiter for file2 as specified

    # Ensure 'license_no' is treated as string to handle any mixed types
    df1['license_no'] = df1['license_no'].astype(str)
    df2['license_no'] = df2['license_no'].astype(str)

    # Create a DataFrame to hold the merged results
    merged_rows = []

    # Iterate over each row in file1 and find a match in file2
    for _, row1 in df1.iterrows():
        license_no = row1['license_no']
        
        # Find the matching row in file2, if exists
        matching_row2 = df2[df2['license_no'] == license_no]
        
        if not matching_row2.empty:
            # If a match is found, merge the rows
            combined_row = {**row1.to_dict(), **matching_row2.iloc[0].to_dict()}
        else:
            # If no match is found, just add the row from file1
            combined_row = row1.to_dict()
        
        merged_rows.append(combined_row)

    # Now add all rows from file2 that do not exist in file1
    unique_rows_in_file2 = df2[~df2['license_no'].isin(df1['license_no'])]
    for _, row2 in unique_rows_in_file2.iterrows():
        merged_rows.append(row2.to_dict())

    # Convert the list of merged rows back into a DataFrame
    merged_df = pd.DataFrame(merged_rows)

    # Save the merged DataFrame to the output file
    merged_df.to_csv(output_file, index=False)
    print(f"Merged data has been saved to '{output_file}'.")

# Ensure that script is run with the correct number of arguments
if len(sys.argv) != 4:
    print("Usage: python merge_csv.py <file1.csv> <file2.txt> <output_file.csv>")
else:
    # Get file paths from command-line arguments
    file1 = sys.argv[1]
    file2 = sys.argv[2]
    output_file = sys.argv[3]

    # Run the function
    merge_files(file1, file2, output_file)