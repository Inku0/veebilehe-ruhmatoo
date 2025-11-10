// autor: Ingvar Saarend, API andmed ja struktuur võetud peatus.ee lehelt
const kenastaAeg = (aeg) => {
  try {
    return new Intl.DateTimeFormat("et-EE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(aeg));
  } catch {
    return "";
  }
};

const looBussiList = (andmed) => {
  const konteiner = document.getElementById("bussiajad-list");
  if (!konteiner) return andmed;
  const teekonnad = andmed.data.viewer.plan.itineraries;

  // igaks juhuks teeme listi tühjaks
  konteiner.innerHTML = "";

  const h3 = document.createElement("h3");
  h3.textContent = `Päringuaeg: ${new Date().toLocaleString("et-EE")}`;
  konteiner.appendChild(h3);

  if (!teekonnad.length) {
    const li = document.createElement("li");
    li.textContent = "Ei leidnud mitte ühtegi bussiaega!";
    konteiner.appendChild(li);
    return andmed;
  }

  teekonnad.forEach((teekond, index) => {
    // iga bussiaeg saab järjest numbri
    const header = document.createElement("p");
    header.innerHTML = `<strong>Bussiaeg ${index + 1}</strong> (hakka liikuma kl ${kenastaAeg(teekond.startTime)} → jõuad ${kenastaAeg(teekond.endTime)})`;
    konteiner.appendChild(header);

    const listIse = document.createElement("ul");

    teekond.legs
      .filter((jalg) => jalg.transitLeg && jalg.mode === "BUS") // ainult bussiajad, mitte jalgsi osad
      .forEach((jalg) => {
        const bussNr = jalg.route.shortName ?? "puudub nr";
        const algPeatus = jalg.from.name ?? "puudub alguse peatus";
        const algAeg = kenastaAeg(jalg.startTime);

        const loppPeatus = jalg.to.name ?? "puudub lõpu peatus";
        const loppAeg = kenastaAeg(jalg.endTime);

        const li = document.createElement("li");
        li.innerHTML = `Buss nr <strong>${bussNr}</strong>: väljub peatusest <em>${algPeatus}</em> kell <strong>${algAeg}</strong>, saabub peatusesse <em>${loppPeatus}</em> kell <strong>${loppAeg}</strong>`;
        listIse.appendChild(li);
      });

    konteiner.appendChild(listIse);
  });

  return andmed;
};

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

const delta =
  "Tartu Ülikooli Delta õppehoone,  Tartu linn,  Tartu linn, Tartu maakond::58.38507,26.725327";
const physicum =
  "Tartu Ülikooli Physicum,  Tartu linn,  Tartu linn, Tartu maakond::58.36618,26.690229";

const algus =
  document.getElementById("pealkiri").getHTML() ===
  "Physicum → Delta bussiajad:"
    ? "physicum"
    : "delta";

// peab olema just selle nimega, muidu graphql ei aktsepteeri
const variables = {
  fromPlace: algus === "delta" ? delta : physicum,
  toPlace: algus === "delta" ? physicum : delta,
  numItineraries: 5, // see määrab ära, mitu bussiaega tuleb
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

document.addEventListener("DOMContentLoaded", () => {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  })
    .then((vastus) => vastus.json())
    .then((andmed) => looBussiList(andmed))
    .catch((err) => {
      const konteiner = document.getElementById("bussiajad-list");
      if (konteiner) {
        const li = document.createElement("li");
        li.textContent = `Viga andmete laadimisel: ${err?.message ?? err}`;
        konteiner.appendChild(li);
      }
      console.error(err);
    });
});
