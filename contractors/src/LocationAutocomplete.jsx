import React, { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import PlacesAutocomplete, { geocodeByAddress } from 'react-places-autocomplete';
import {APIProvider} from '@vis.gl/react-google-maps';

function LocationAutocomplete({ locationQuery, setLocationQuery, setLocation }) {

  const [autocompleteEnabled, setAutocompleteEnabled] = useState(false);

  const [address, setAddress] = useState(locationQuery)

  const handleSelect = async (address) => {
    const results = await geocodeByAddress(address);
    const selectedLocation = JSON.parse(JSON.stringify(results[0]));
    setLocation(selectedLocation);
    setLocationQuery(selectedLocation.formatted_address);
    setAddress(selectedLocation.formatted_address)
  };

  const handleClear = () => {
    setLocationQuery('');
    setLocation(null);
  };

  const handleInputChange = (query) => {
    if (/^\d{2}/.test(locationQuery)) {
      // Enable autocomplete when the first two characters are numbers and length is 3 or more
      setAutocompleteEnabled(locationQuery.length >= 3);
    } else {
      // Enable autocomplete when the length is 2 or more for other input patterns
      setAutocompleteEnabled(locationQuery.length >= 2);
    }
    setAddress(query)
    setLocationQuery(query)
  }


  return (
    <APIProvider apiKey={import.meta.env.VITE_REACT_APP_GOOGLE_API_KEY} onError={()=>console.log('error')} libraries={["places"]} onLoad={() => console.log('Maps API has loaded.')}>
    <PlacesAutocomplete
      value={locationQuery}
      onChange={handleInputChange}
      debounce={300}
      onSelect={handleSelect}
      googleCallbackName='mycallback'
      shouldFetchSuggestions={autocompleteEnabled}
    >
      {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
        <div style={{ position: 'relative' }}>
          <TextField
            onChange={(e) => handleInputChange(event.target.value)}
            {...getInputProps({
              label: 'Location',
              variant: 'outlined',
              fullWidth: true,              
            })}
            InputProps={{
              endAdornment: (
                <>{locationQuery && <InputAdornment position="end">
                  <IconButton onClick={handleClear} aria-label="clear location">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>}</>
              ),
            }}
          />
          <div
            style={{
              position: 'absolute',
              zIndex: 3,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              width: '100%',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            }}
          >
            {loading && <div>Loading...</div>}
            {suggestions.map((suggestion) => {
              const style = {
                backgroundColor: suggestion.active ? '#fafafa' : '#fff',
                cursor: 'pointer',
                padding: '10px',
                borderBottom: '1px solid #ccc'
              };
              return (
                <div {...getSuggestionItemProps(suggestion, { style })}>
                  {suggestion.description}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PlacesAutocomplete>
    </APIProvider>
  );
}

export default LocationAutocomplete;