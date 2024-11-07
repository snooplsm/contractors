import React, { useState, useEffect } from 'react';
import moment from 'moment';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip
} from '@mui/material';

import { geocodeByAddress } from 'react-places-autocomplete';
import LocationAutocomplete from './LocationAutocomplete';
import StatusAutocomplete from './StatusAutoComplete';
import StateAutoComplete from './StateAutoComplete';

function ContractorList() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState('');
  const [location, setLocation] = useState();
  const [locationQuery, setLocationQuery] = useState('');
  const [sortField, setSortField] = useState('location'); // Default sort field
  const [sortOrder, setSortOrder] = useState('asc');       // Default sort order
  const [status, setStatus] = useState(['Active'])
  const [state, setState] = useState([])

  useEffect(()=> {
    localStorage.setItem('status', JSON.stringify(status))
  }, [status])

  useEffect(() => {
    const loc = localStorage.getItem('location');
    if (loc) {
      const location = JSON.parse(loc);
      setLocation(location);
      setLocationQuery(location.formatted_address);
    }
    const name = localStorage.getItem('name');
    if (name) {
      setName(name);
    }
    const status = localStorage.getItem('status')
    if(status) {
      setStatus(JSON.parse(status))
    }
  }, []);

  useEffect(() => {
    const fetchContractors = async () => {
      setLoading(true);
      let latitude = "";
      let longitude = "";
      if (location?.geometry?.location?.lat) {
        latitude = location.geometry.location.lat;
        longitude = location.geometry.location.lng;
      }
      try {
        const url = new URL("http://localhost:3000/contractors");

        const params = new URLSearchParams({
          page: page + 1,
          limit: rowsPerPage,
          latitude,
          longitude,
          full_name: name,
          sort_by: sortField,
          sort_order: sortOrder,
          license_status: status || "",
          city_state: state
        });

        // Set the search parameters directly on the URL
        url.search = params;

        const response = await fetch(url);
        const data = await response.json();
        setContractors(data.contractors);
        setTotal(data.total);
      } catch (error) {
        console.error('Failed to fetch contractors:', error);
      }
      setLoading(false);
    };
    fetchContractors();
  }, [page, rowsPerPage, location, name, state, sortField, sortOrder, status]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortField(field);
    setSortOrder(isAsc ? 'desc' : 'asc');  // Toggle sort order
  };

  function obfuscateEmail(email) {
    return email
    // return (email || '').split('').map(char => `&#x${char.charCodeAt(0).toString(16)};`).join('');
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    console.log(lat1,lon1,lat2,lon2)
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
  
    const R = 3958.8; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return (R * c).toFixed(1); // Distance in kilometers
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ padding: 0 }}>
        Contractor List
      </Typography>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      {/* Filter Inputs */}
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
        <TextField
          label="Name"
          variant="outlined"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            localStorage.setItem('name', e.target.value);
          }}
        />
        <StatusAutocomplete
          status={status}
          setStatus={setStatus}          
        />
        <StateAutoComplete
          state={state}
          setState={setState}/>
        {/* Location Autocomplete Input */}
        <LocationAutocomplete
          value={locationQuery}
          setLocationQuery={setLocationQuery}
          setLocation={setLocation}
          locationQuery={locationQuery}
        />

      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                  Name {sortField === 'full_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('license_no')} style={{ cursor: 'pointer' }}>
                  License No {sortField === 'license_no' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('license_status_name')} style={{ cursor: 'pointer' }}>
                  Status {sortField === 'license_status_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('issue_date')} style={{ cursor: 'pointer' }}>
                  Issued {sortField === 'issue_date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('expiration_date')} style={{ cursor: 'pointer' }}>
                  Expiration {sortField === 'expiration_date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('addr_email')} style={{ cursor: 'pointer' }}>
                  Email {sortField === 'addr_email' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>
                  Location {sortField === 'location' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                {location && <TableCell onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>
                  Dist (mi) {sortField === 'location' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}         
                </TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {contractors.map((contractor) => (
                <TableRow key={contractor.id}
                sx={{
                  backgroundColor: contractor.license_status_name.toLowerCase() !== 'active' ? '#FFEBEE' : 'inherit',
                }}>
                  <TableCell 
                    sx={{
                      fontSize:
                        contractor.full_name ==null ? '1em' :
                        contractor.full_name.length > 20 ? '0.6em' :
                        contractor.full_name.length > 15 ? '0.7em' :
                        contractor.full_name.length > 10 ? '0.8em' :
                        '1em',
                    }}
                  >{contractor.full_name}</TableCell>
                  <TableCell>{contractor.license_no}</TableCell>
                  <TableCell>{contractor.license_status_name}</TableCell>
                  <TableCell>{moment(contractor.issue_date, 'YYYY-MM-DD').format('M/D/YY')}</TableCell>
                  <TableCell>{moment(contractor.expiration_date, 'YYYY-MM-DD').format('M/D/YY')}</TableCell>
                  <TableCell
                    sx={{
                      fontSize:
                      contractor.addr_email==null ? '1em' :
                      contractor.addr_email.length > 20 ? '0.6em' :
                      contractor.addr_email.length > 15 ? '0.7em' :
                      contractor.addr_email.length > 10 ? '0.8em' :
                      '1em',
                  }}
                  >
                    {/* <a href="mailto:&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#64;&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#46;&#99;&#111;&#109;">
  &#101;&#120;&#97;&#109;&#112;&#108;&#101;&#64;&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#46;&#99;&#111;&#109;
</a> */}
                    <a href="#" onClick={(event) => navigator.clipboard.writeText(event.target.innerText)}>{obfuscateEmail(contractor.addr_email)}</a>
                    </TableCell>
                  <TableCell
                    sx={{
                    fontSize:
                    contractor.addr_city==null ? '1em' :
                    contractor.addr_city.length > 20 ? '0.6em' :
                    contractor.addr_city.length > 15 ? '0.7em' :
                    contractor.addr_city.length > 10 ? '0.8em' :
                    '1em',
                }}
                  ><Tooltip title={`${contractor.addr_line_1}, ${contractor.addr_city}, ${contractor.addr_state} ${contractor.addr_zipcode}`} placement="top" arrow enterDelay={300} leaveDelay={200}>{contractor.addr_city}</Tooltip>                
                  </TableCell>
                  {location &&
                  <TableCell>
                    {getDistance(location.geometry.location.lat,location.geometry.location.lng,contractor.location.split(",")[0],contractor.location.split(",")[1])}  
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default ContractorList;