import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

function StateAutoComplete({ state, setState }) {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await fetch(`http://localhost:3000/cities`);
        const data = await response.json();
        setStates(data || []);
      } catch (error) {
        console.error('Error fetching statuses:', error);
      }
      setLoading(false);
    };
    fetchStatuses();
  }, []);

  return (
    <Autocomplete
      sx={{ minWidth: '230px' }}
      options={states}
      value={state || ""}
      
      multiple
      onChange={(_event, newValue) => {
        setState(newValue)
      }}
      // onInputChange={(event, inputValue) => {
      //   console.log("onInputChange",inputValue)
      //   setStatus("")
      // }}
      getOptionLabel={(option) => option}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label="City/State"
          sx={{
            fontSize: '.7em'
          }}
          variant="outlined"
          InputLabelProps={{
            shrink: true, // Keeps the label visible above the text field
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <InputAdornment position="end">
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : (
                //   <IconButton onClick={handleClear} aria-label="clear">
                //     <ClearIcon />
                //   </IconButton>
                <></>
                )}
                {params.InputProps.endAdornment}
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}

export default StateAutoComplete;