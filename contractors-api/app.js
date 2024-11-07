require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes, Op, fn, col, where, literal } = require('sequelize');

const app = express();
const cors = require('cors');
app.use(cors());
const PORT = process.env.PORT || 3000;

// Initialize Sequelize with PostgreSQL connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
  }
);

// Define the Contractor model
const Contractor = sequelize.define('Contractor', {
  full_name: { type: DataTypes.STRING },
  license_status_name: { type: DataTypes.STRING },
  issue_date: { type: DataTypes.DATE },
  expiration_date: { type: DataTypes.DATE },
  addr_city: { type: DataTypes.STRING },
  addr_state: { type: DataTypes.STRING },
  addr_line_1: { type: DataTypes.STRING },
  addr_line_2: { type: DataTypes.STRING },
  addr_zipcode: { type: DataTypes.STRING },
  addr_county: {
    type: DataTypes.STRING
  },
  addr_email: { type: DataTypes.STRING },
  license_no: { type: DataTypes.STRING },
  profession_name: { type: DataTypes.STRING },
  location: {
    type: DataTypes.GEOMETRY('POINT', 4326),  // PostGIS point type
    get() {
      const loc = this.getDataValue('location');
      if (loc && loc.coordinates) {
        return `${loc.coordinates[1]},${loc.coordinates[0]}`;  // latitude,longitude format
      }
      return null;
    }
  }
}, {
  tableName: 'contractor_data',
  timestamps: false
});

const ContractorRating = sequelize.define('ContractorRating', {
  contractor_data_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ContractorData', // Ensure a foreign key constraint to the ContractorData table
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  rating: {
    type: DataTypes.DECIMAL(4, 3),
    allowNull: false,
    validate: {
      min: 1.000,
      max: 10.000,
    },
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sub_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  table_name: 'contractor_rating',
  timestamps: false
});

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connected...'))
  .catch(err => console.log('Error: ' + err));

// API Endpoint with Filtering, Sorting, Proximity Query, Pagination
app.get('/contractors', async (req, res) => {
  const {
    full_name,
    license_status,
    city_state,
    latitude,
    longitude,
    sort_by = 'location',
    sort_order = 'asc',
    issue_data,
    expiration_date
  } = req.query;

  const { page = 1, limit = 50 } = req.query;

  const offset = (page - 1) * limit;

  try {
    // Build query filters
    const filters = {};

    if (full_name) {
      filters.full_name = { [Op.iLike]: `%${full_name}%` };
    }

    let statusArray = license_status ? license_status.split(',').map(status => status.trim()) : [];
    if (statusArray.length === 0 || statusArray[0].trim() === '') {
      statusArray = []
    }
    if(statusArray.length>0) {
      filters.license_status_name = {
        [Op.or]: statusArray.map(status => ({ [Op.iLike]: status }))
      };
    }

    // Handle city_state filter
    if (city_state) {
      const [cityPart, statePart] = city_state.split(',').map(part => part.trim());
      if (cityPart) filters.addr_city = { [Op.iLike]: `%${cityPart}%` };
      if (statePart) filters.addr_state = { [Op.iLike]: `%${statePart}%` };
    }

    // Ensure valid location with spatial constraints
    filters.location = {
      [Op.and]: [
        { [Op.not]: null },  // Ensure location is not null
        where(literal('ST_IsValid(location::geometry)'), true),  // Only valid geometries
        where(literal('ST_X(location::geometry)'), { [Op.between]: [-180, 180] }),  // Longitude range
        where(literal('ST_Y(location::geometry)'), { [Op.between]: [-90, 90] })     // Latitude range
      ]
    };

    // Base query options
    const queryOptions = {
      where: filters,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };

    // Sorting logic
    const order = [];
    if (sort_by === 'location' && latitude && longitude) {
      order.push([
        fn(
          'ST_Distance',
          col('location'),
          fn('ST_SetSRID', fn('ST_MakePoint', parseFloat(longitude), parseFloat(latitude)), 4326)
        ),
        sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      ]);
    } else {
      order.push([sort_by, sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC']);
    }
    queryOptions.order = order;

    // Execute query
    const { rows: contractors, count: total } = await Contractor.findAndCountAll(queryOptions);

    res.json({
      contractors,
      totalPages: Math.ceil(total / limit),
      total,
      page: parseInt(page, 10)
    });
  } catch (error) {
    console.error('Error retrieving contractors:', error);
    res.status(500).json({ message: 'An error occurred while retrieving contractors' });
  }
});

app.get('/contractors/counties', async (req, res) => {
  try {
    // Query to get contractor counts grouped by county and state in a case-insensitive way
    const countyStateCounts = await Contractor.findAll({
      attributes: [
        [sequelize.fn('LOWER', sequelize.col('addr_county')), 'county'],  // Convert addr_county to lowercase
        [sequelize.fn('LOWER', sequelize.col('addr_state')), 'state'],    // Convert addr_state to lowercase
        [sequelize.fn('COUNT', sequelize.col('addr_county')), 'count']
      ],
      group: [
        sequelize.fn('LOWER', sequelize.col('addr_county')),
        sequelize.fn('LOWER', sequelize.col('addr_state'))
      ],
      having: sequelize.literal('COUNT(addr_county) > 0'),  // Filter for count > 0
      order: [[sequelize.literal('count'), 'DESC']],         // Order by count in descending order
      raw: true
    });

    // Format response
    console.log(countyStateCounts)
    const formattedResponse = {};
    countyStateCounts.forEach(item => {
      const state = item.state;
      const county = item.county;
      const count = item.count;

      // Initialize state if it doesn't exist
      if (!formattedResponse[state]) {
        formattedResponse[state] = {};
      }

      // Add county count to the state
      formattedResponse[state][county] = count;
    });
    countyStateCounts.forEach(item => {
      console.log(item)
    })


    res.json(formattedResponse);
  } catch (error) {
    console.error('Error retrieving county and state counts:', error);
    res.status(500).json({ message: 'An error occurred while retrieving county and state counts' });
  }
});

app.get('/contractors/:id', async (req, res) => {
  const contractorId = req.params.id;

  try {
    // Find the contractor by ID and include all associated data
    const contractor = await Contractor.findOne({
      where: { id: contractorId },
      attributes: [
        'id',
        'full_name',
        'first_name',
        'middle_name',
        'last_name',
        'name_suffix',
        'profession_name',
        'license_type_name',
        'license_no',
        'issue_date',
        'expiration_date',
        'addr_line_1',
        'addr_line_2',
        'addr_city',
        'addr_state',
        'addr_zipcode',
        'county',  // previously addr_county
        'addr_email',
        'license_status_name',
        [
          sequelize.fn(
            'CONCAT',
            sequelize.literal('location.coordinates[1]'),
            ',',
            sequelize.literal('location.coordinates[0]')
          ),
          'location'
        ]
      ]
    });

    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    res.json(contractor);
  } catch (error) {
    console.error('Error retrieving contractor data:', error);
    res.status(500).json({ message: 'An error occurred while retrieving contractor data' });
  }
});

app.get('/statuses', async (req, res) => {
  try {
    const statuses = await Contractor.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('license_status_name')), 'license_status_name']
      ],
      order: [[Sequelize.col('license_status_name'), 'ASC']]
    });

    // Extract unique status values from the response
    const uniqueStatuses = statuses.map(status => status.license_status_name);
    res.json({ statuses: uniqueStatuses });
  } catch (error) {
    console.error('Error fetching contractor statuses:', error);
    res.status(500).json({ error: 'An error occurred while fetching statuses.' });
  }
});

app.get('/states', async (req, res) => {
  try {
    const uniqueStates = await Contractor.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.fn('LOWER', sequelize.col('addr_state'))), 'addr_state']],
      where: {
        addr_state: { [Op.ne]: null }, // Exclude null values
      },
      order: [[sequelize.fn('LOWER', sequelize.col('addr_state')), 'ASC']],
      raw: true,
    });


    res.status(200).json(uniqueStates.map(state => state.addr_state));
  } catch (error) {
    console.error('Error fetching unique states:', error);
    res.status(500).json({ error: 'An error occurred while fetching unique states.' });
  }
});

app.get('/cities', async (req, res) => {
  try {
    const uniqueCityStates = await Contractor.findAll({
      attributes: [
        [
          fn(
            'DISTINCT',
            fn(
              'LOWER',
              fn(
                'TRIM',
                literal("addr_city || ', ' || addr_state")
              )
            )
          ),
          'city_state'
        ]
      ],
      where: {
        addr_city: { [Op.not]: null }, // Exclude null values for city
        addr_state: { [Op.not]: null } // Exclude null values for state
      },
      order: [[literal("LOWER(TRIM(addr_city || ', ' || addr_state))"), 'ASC']],
      raw: true,
    });

    res.status(200).json(uniqueCityStates.map(item => item.city_state));
  } catch (error) {
    console.error('Error fetching unique city-state combinations:', error);
    res.status(500).json({ error: 'An error occurred while fetching unique city-state combinations.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the token with Google API
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { email, name } = response.data;

    // Proceed with user authentication
    // (e.g., check if user exists in the database, create a new user, etc.)

    res.json({ message: 'Login successful', email, name });
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.post('/api/contractor-rating', async (req, res) => {
  const { contractor_data_id, rating, note, sub_type } = req.body;

  try {
    // Create the new contractor rating
    const contractorRating = await ContractorRating.create({
      contractor_data_id,
      rating,
      note,
      sub_type,
    });

    res.status(201).json({
      message: 'Contractor rating created successfully',
      contractorRating,
    });
  } catch (error) {
    console.error('Error creating contractor rating:', error);
    res.status(500).json({ error: 'An error occurred while creating the contractor rating.' });
  }
});




// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});