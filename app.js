const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT * 
    FROM state;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});

//Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
      * 
    FROM 
      state 
    WHERE 
      state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(state));
});

//Create a district in the district table, district_id is auto-incremented
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
  INSERT INTO
    district (district_name, state_id, cases, cured, active, deaths)
  VALUES
    ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;
  const district = await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

//Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT 
      * 
    FROM 
      district 
    WHERE 
      district_id = ${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDbObjectToResponseObject(district));
});

//Deletes a district from the district table based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE 
    FROM 
      district 
    WHERE 
      district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `
  UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};`;
  const district = await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get("/states/:stateId/stats/", async (request, response) => {
  const getStatisticsQuery = `
    SELECT SUM(cases) as totalCases, SUM(cured) as totalCured, 
    SUM(active) as totalActive, SUM(deaths) as totalDeaths
    FROM state INNER JOIN district ON state.stateId = district.stateId;`;
  const statistics = await db.get(getStatisticsQuery);
  response.send(statistics);
});

//Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const getState = `
    SELECT stateName
    FROM district INNER JOIN state ON district.stateId = state.stateId
    WHERE district_id = ${districtId}`;
  const stateName = await db.get(getState);
  response.send(stateName);
});

module.exports = app;
