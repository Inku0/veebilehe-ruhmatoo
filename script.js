// autor: Ingvar Saarend, API andmed ja struktuur võetud peatus.ee lehelt
const fetchBussideAndmed = async () => {
  const url = "https://api.peatus.ee/routing/v1/routers/estonia/index/graphql";

  // peab olema just selle nimega, muidu graphql ei aktsepteeri
  const query = `
    query Plan(
      $fromPlace: String!,
      $toPlace: String!,
      $numItineraries: Int!,
      $modes: [TransportMode!],
      $date: String!,
      $time: String!,
      $walkReluctance: Float,
      $maxWalkDistance: Float,
      $walkBoardCost: Int,
      $minTransferTime: Int,
      $walkSpeed: Float,
      $wheelchair: Boolean,
      $ticketTypes: [String],
      $arriveBy: Boolean,
      $transferPenalty: Int,
      $bikeSpeed: Float,
      $optimize: OptimizeType,
      $unpreferred: InputUnpreferred,
      $modeWeight: InputModeWeight
    ) {
      viewer {
        plan(
          fromPlace: $fromPlace,
          toPlace: $toPlace,
          numItineraries: $numItineraries,
          transportModes: $modes,
          date: $date,
          time: $time,
          walkReluctance: $walkReluctance,
          maxWalkDistance: $maxWalkDistance,
          walkBoardCost: $walkBoardCost,
          minTransferTime: $minTransferTime,
          walkSpeed: $walkSpeed,
          wheelchair: $wheelchair,
          allowedTicketTypes: $ticketTypes,
          arriveBy: $arriveBy,
          transferPenalty: $transferPenalty,
          bikeSpeed: $bikeSpeed,
          optimize: $optimize,
          unpreferred: $unpreferred,
          modeWeight: $modeWeight
        ) {
          date
          itineraries {
            startTime
            endTime
            legs {
              mode
              startTime
              endTime
              distance
              transitLeg
              legGeometry { points }
              route { shortName type color agency { name id } id }
              from {
                name lat lon
                stop { gtfsId code platformCode id }
                bikeRentalStation { stationId name lat lon bikesAvailable spacesAvailable state networks id }
              }
              to {
                name lat lon
                stop { gtfsId code platformCode id }
                bikeRentalStation { stationId name lat lon bikesAvailable spacesAvailable state networks id }
              }
            }
          }
        }
      }
      serviceTimeRange { start end }
    }
  `;

  // peab olema just selle nimega, muidu graphql ei aktsepteeri
  const variables = {
    fromPlace:
      "Tartu Ülikooli Delta õppehoone,  Tartu linn,  Tartu linn, Tartu maakond::58.38507,26.725327",
    toPlace:
      "Tartu Ülikooli Physicum,  Tartu linn,  Tartu linn, Tartu maakond::58.36618,26.690229",
    numItineraries: 5,
    modes: [{ mode: "BUS" }, { mode: "WALK" }],
    date: new Date().toISOString().split("T")[0], // "2025-10-22",
    time: new Date().toLocaleString("et"), // "14:48:23"
    walkReluctance: 1.8,
    maxWalkDistance: 10000,
    walkBoardCost: 120,
    minTransferTime: 90,
    walkSpeed: 1.2,
    wheelchair: false,
    ticketTypes: null,
    arriveBy: false,
    transferPenalty: 0,
    bikeSpeed: 5.55,
    optimize: "GREENWAYS",
    unpreferred: null,
    modeWeight: null,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }), // ootab selles formaadis, muidu peaks tegema nt { ..., variables: muutujad}
  });

  const data = await res.json();
  console.log(data);
};

fetchBussideAndmed();
