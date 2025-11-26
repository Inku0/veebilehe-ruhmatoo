// autor: Ingvar Saarend, API andmed ja struktuur võetud peatus.ee lehelt

// KONSTANDID
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

    if (!teekond.legs) {
      const sisu = document.createElement("p");
      sisu.textContent = "Viga! bussiajal puudub info.";
      loeteluLiikmeKonteiner.appendChild(sisu);
    }

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

// see funktsioon vastutab API HTTP päringu eest
const saaBussiajad = async (signal) => {
  // asünkroonne, seega tagastab lubaduse, mis lahendub, kui kõik korrektselt läheb
  const vastus = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // tahame JSON formaadis andmeid
    body: JSON.stringify({ query, variables }), // API tahab ka JSON, seega teeme päringu keha JSON-iks
    // .stringify() võtab kuni kaks väärtust: algne väärtus (siin kohal muutuja `query`) ning valikuline replacer (siin kohal muutuja `variables`)
    // replacer asendab algses väärtuses need väljad, mis on variables-is antud
    signal, // lisame signaali, et saaks vajadusel päringu katkestada
  });

  const konteiner = document.getElementById("bussiajad-konteiner");
  if (!konteiner) {
    throw new Error("konteiner element ID'ga bussiajad-konteiner puudub!");
  }

  if (!vastus.ok) {
    // kontrollime HTTP päringu staatust
    // kui staatuskood pole vahemikus 200-299, siis viskame veateate
    const p = document.createElement("p"); // loome uue <p> elemendi, kuhu veateade kirjutada
    p.textContent = `HTTP päringu viga: ${vastus.status} ${vastus.statusText}`;
    konteiner.appendChild(p);

    throw new Error(
      `HTTP päringu viga: ${vastus.status} ${vastus.statusText}`, // viskame igaks juhuks ka veateate, mis kohe lõpetab skripti töö
    );
  }

  const sisuTyyp = vastus.headers.get("content-type") || "";
  if (!sisuTyyp.includes("application/json")) {
    const text = await vastus.text();

    const p = document.createElement("p");
    p.textContent = `Ootasin JSON-i, kuid sain hoopis "${sisuTyyp ?? "puudub"}". Esimesed baidid: ${text.slice(0, 200)}`;
    konteiner.appendChild(p);

    throw new Error(
      `Ootasin JSON-i, kuid sain hoopis "${sisuTyyp ?? "puudub"}". Esimesed baidid: ${text.slice(0, 200)}`,
    );
  }

  let sisu;
  try {
    sisu = await vastus.json();
  } catch (e) {
    const p = document.createElement("p");
    p.textContent = `JSON parssimise viga: ${e.message}`;
    konteiner.appendChild(p);

    throw new Error(`JSON parssimise viga: ${e.message}`);
  }

  if (Array.isArray(sisu.errors) && sisu.errors.length) {
    const vead = sisu.errors
      .map((viga, index) => `${index + 1}) ${viga.message}`)
      .join(" | "); // koostame veateadete loetelu

    const p = document.createElement("p");
    p.textContent = `GraphQL vead: ${vead}`;
    konteiner.appendChild(p);

    throw new Error(`GraphQL vead: ${vead}`);
  }

  const itineraries = sisu?.data?.viewer?.plan?.itineraries;
  if (!Array.isArray(itineraries)) {
    const p = document.createElement("p");
    p.textContent =
      "API vastuses puudub 'data.viewer.plan.itineraries' massiiv.";
    konteiner.appendChild(p);

    throw new Error(
      "API vastuses puudub 'data.viewer.plan.itineraries' massiiv.",
    );
  }

  return sisu;
};

let httpKontroll = null;

// see funktsioon juhib tervet n-ö flow'd:
// päri andmeid -> spinner -> tegele veateadetega -> renderda -> kustuta laadimise värgid
const bussiajadKompositsioon = async () => {
  const spinner = document.getElementById("laadimine-spinner");
  const konteiner = document.getElementById("bussiajad-konteiner");

  if (spinner === null || konteiner === null) {
    throw new Error("Spinner või konteiner elementi ei leitud!");
  }

  // paneme laadimise spinneri tööle
  spinner.style.display = "flex";

  // katkestame päringu, mis võis veel lennus olla
  httpKontroll?.abort(); // küsimärk tähendab, et ta ei lenda katastroofiliselt õhku, kui httpKontroll peaks olema null (ei ole ühtegi lennus päringut)
  httpKontroll = new AbortController();

  try {
    const andmed = await saaBussiajad(httpKontroll.signal);
    looBussiList(andmed);

    // kui jõudsime siia, siis oli kõik edukas
    const olemasNupp = document.getElementById("proovi-uuesti-nupp");
    if (olemasNupp) olemasNupp.remove();
  } finally {
    spinner.style.display = "none";
  }
};

// loob vea korral nupu, millega saab uuesti proovida
const errorNupp = (err) => {
  const konteiner = document.getElementById("bussiajad-konteiner");
  if (!konteiner) {
    throw new Error(
      `Viga! API päring nurjus ning konteiner on ka puudu. Kõik on pekkis. ${err}`,
    );
  }

  // igaks juhuks kustutame olemasoleva nupu, kui see peaks olemas olema
  const olemasNupp = document.getElementById("proovi-uuesti-nupp");
  if (olemasNupp) olemasNupp.remove();

  const teade = document.createElement("p");
  teade.className = "vea-teade";
  teade.textContent = `Viga andmete laadimisel: ${err.message ?? err}`;
  konteiner.appendChild(teade);

  const nupp = document.createElement("button");
  nupp.id = "proovi-uuesti-nupp";
  nupp.type = "button";
  nupp.textContent = "Proovi uuesti andmeid pärida";

  nupp.addEventListener("click", () => {
    nupp.disabled = true;
    nupp.textContent = "Andmed laevad";

    bussiajadKompositsioon()
      .catch(errorNupp) // püüa kinni veateated
      .finally(() => {
        // igal juhul tee lõpuks järgnevat
        nupp.disabled = false;
        nupp.textContent = "Proovi uuesti andmeid pärida";
        teade.remove();
      });
  });

  konteiner.appendChild(nupp);
};

// see funktsioon lisab dokumenti (veebileht) kuulaja, mis aktiveerub, kui veebileht on lõplikult sisse laetud (DOMContentLoaded)
document.addEventListener("DOMContentLoaded", () => {
  bussiajadKompositsioon().catch((err) => {
    errorNupp(err);
    throw new Error(`Viga! API päring nurjus. ${err}`);
  });
});
