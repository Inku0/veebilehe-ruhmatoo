// autor: Ingvar Saarend, API andmed ja struktuur võetud peatus.ee lehelt

// see funktsioon võtab argumendina aja (selle skripti puhul on aeg UNIX epoch formaadis ehk x millisekundit 1970. aasta 1. jaanuarist vmt)
// ning teeb sellest uue Date objekti, mille ta viib sobivale eestilikule kujule
const kenastaAeg = (aeg) => {
  try {
    return new Intl.DateTimeFormat("et-EE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(aeg));
  } catch {
    return "Viga! API tagastas aja vales formaadis.";
  }
};

// see funktsioon kasutab olemasolevaid <div> ja <ul> elemente, et lisada <li> elemente (bussiaegu)
const looBussiList = (andmed) => {
  const konteiner = document.getElementById("bussiajad-konteiner"); // see on see <div> element, mille ID on bussiajad-konteiner

  if (!konteiner) {
    console.error("konteinerit ID-ga #bussiajad-konteiner ei leitud!");
    return andmed;
  } // kui seda <div> elementi pole, siis return'i kohe ehk lõpeta oma töö kohe

  const h3 = document.createElement("h3"); // loome uue H3 elemendi
  h3.textContent = `Päringu aeg: ${new Date().toLocaleString("et-EE")}`; // mille sisuks paneme tänase kuupäeva ja kellaaja eestilikus formaadis (DD.MM.YY, HH:mm:ss)
  konteiner.appendChild(h3); // lisame <div> elemendile

  // API-lt tagastatud andmed on muidu päris komplekssel kujul
  const teekonnad = andmed.data.viewer.plan.itineraries; // siin asub bussiaegade massiiv

  // kontrollime, kas me üldse saime bussiaegu
  if (!teekonnad.length) {
    // 0 on falsy väärtus
    const h3 = document.createElement("h3"); // loome uue <h3> elemendi
    h3.textContent = "Ei leidnud mitte ühtegi bussiaega!"; // ja paneme sisuks veateate
    konteiner.appendChild(h3); // lisame <div> elemendile
    return andmed; // ning lõpetame töö
  }

  const loetelu = document.getElementById("bussiajad-loetelu"); // see on see <ul> element, mille ID on bussiajad-loetelu
  loetelu.innerHTML = ""; // igaks juhuks teeme loetelu kõigepealt tühjaks

  // nüüd võime kindlad olla, et saime bussiaegu
  teekonnad.forEach((teekond, index) => {
    // iga bussiajaga teeme järgnevat
    // index argument on forEach poolt antud ning see annab igale bussiajale järjest numbri

    const loeteluLiige = document.createElement("li"); // loome uue <li> elemendi, mis saab hoidma konteinerit, milles on pealkiri ja bussiaeg
    const loeteluLiikmeKonteiner = document.createElement("div"); // loome selle konteineri ehk uue <div> elemendi
    const header = document.createElement("p"); // loome selle pealkirja ehk uue <p> elemendi

    header.innerHTML = `<strong>Bussiaeg ${index + 1}</strong> (hakka liikuma kl ${kenastaAeg(teekond.startTime)} → jõuad ${kenastaAeg(teekond.endTime)})`;
    // pealkiri on meile sobival kujul bussiaja andmetest koostatud

    loeteluLiikmeKonteiner.appendChild(header); // lisame sellele konteinerile pealkirja

    teekond.legs // iga teekonna osa kohta
      .filter((jalg) => jalg.transitLeg && jalg.mode === "BUS") // meid huvitavad ainult bussitsi osad, mitte jalgsi osad
      .forEach((jalg) => {
        // iga bussiajaga tee järgnevat

        // ?? tähendab nullish coalescing operator vmt, põhimõtteliselt ta kontrollib, kas vasakpoolne väärtus on tõene või väär, ning kui on väär, siis tagastab parempoolse väärtuse
        // põhimõtteliselt vaikeväärtus
        const bussNr = jalg.route.shortName ?? "puudub nr";
        const algPeatus = jalg.from.name ?? "puudub alguse peatus";
        const algAeg = kenastaAeg(jalg.startTime);

        const loppPeatus = jalg.to.name ?? "puudub lõpu peatus";
        const loppAeg = kenastaAeg(jalg.endTime);

        const sisu = document.createElement("p"); // loome uue <p> elemendi (bussiaja andmed)

        sisu.innerHTML = `Buss nr <strong>${bussNr}</strong>: väljub peatusest <em>${algPeatus}</em> kell <strong>${algAeg}</strong>, saabub peatusesse <em>${loppPeatus}</em> kell <strong>${loppAeg}</strong>`;
        loeteluLiikmeKonteiner.appendChild(sisu); // lisame sellele konteinerile nüüd päris bussiaja ka
      });

    loeteluLiige.appendChild(loeteluLiikmeKonteiner); // paneme kogu selle konteiner elemendi, milles on pealkiri ja andmed, <li> elemendi sisse
    loeteluLiige.appendChild(document.createElement("hr")); // lisame <li> elemendi sisse ka horisontaalse joone, mis eraldab bussiaegu visuaalselt
    loetelu.appendChild(loeteluLiige); // lisame nüüd selle <li> elemendi <ul>-i (loeteluliige läheb loetellu)
  });
  konteiner.appendChild(loetelu); // lisame terve selle loetelu lõpuks vanem <div> elemendile

  return andmed; // lõpetame töö
};

// API URL
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

// GraphQL-ile sobiv formaat
const delta =
  "Tartu Ülikooli Delta õppehoone,  Tartu linn,  Tartu linn, Tartu maakond::58.38507,26.725327";
const physicum =
  "Tartu Ülikooli Physicum,  Tartu linn,  Tartu linn, Tartu maakond::58.36618,26.690229";

// et määrata ära, kumba pidi peaks teekonda küsima, vaatame elementi, mille ID on pealkiri
const algus =
  // kui pealkiri on "Physicum -> Delta bussiajad:", siis algus on physicum, muul juhul on delta
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
  date: new Date().toISOString().split("T")[0], // "2025-10-22", määrab kuupäeva (saaks lasta kasutajal muuta)
  time: new Date().toLocaleString("et"), // "14:48:23", määrab kellaaja (saaks lasta kasutajal muuta)
  walkReluctance: 1.8,
  maxWalkDistance: 10000,
  walkBoardCost: 120,
  minTransferTime: 90,
  walkSpeed: 1.2,
  wheelchair: false,
  ticketTypes: null,
  arriveBy: false, // peaks määrama max kellaaja, enne mida peab jõudma (saaks lasta kasutajal muuta)
  transferPenalty: 0,
  bikeSpeed: 5.55,
  optimize: "GREENWAYS",
  unpreferred: null,
  modeWeight: null,
};

// see jookseb kohe, kui skript sisse laetakse
// lisab dokumendile (HTML lehele) kuulaja, mis aktiveerub, kui veebileht on ära laetud (DOMContentLoaded)
document.addEventListener("DOMContentLoaded", () => {
  // teeme POST päringu peatus.ee GraphQL API-le
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // tahame JSON formaadis andmeid
    body: JSON.stringify({ query, variables }), // API tahab ka JSON, seega teeme JSON-iks
    // .stringify() võtab kuni kaks väärtust: algne väärtus (siin kohal muutuja `query`) ning valikuline replacer (siin kohal muutuja `variables`)
    // replacer asendab algses väärtuses need väljad, mis on variables-is antud
  })
    .then((vastus) => vastus.json()) // .json() meetod loeb JSON-i JavaScript objektiks
    // (kasutab taustal ka lubadusi selleks (mis lahenduvad, kui edukalt on loetud))

    .then((andmed) => looBussiList(andmed)) // andmed käes -> kutsume välja looBussiList funktsiooni nende andmetega

    .catch((err) => {
      // püüab kinni veateate
      const konteiner = document.getElementById("bussiajad-list");
      if (konteiner) {
        const p = document.createElement("p"); // loome uue <p> elemendi, kuhu veateade kirjutada
        p.textContent = `Viga andmete laadimisel: ${err?.message ?? err}`;
        konteiner.appendChild(p);
      }
      console.error(
        "Viga! API päring nurjus ning konteiner ka puudub. Kõik on pekkis.",
        err,
      );
    });
});
