// Tuodaan Reactin useEffect- ja useState-hookit "react"-kirjastosta.
// useState: mahdollistaa komponentin oman tilan (muuttuvan datan) tallentamisen.
// useEffect: mahdollistaa "sivuvaikutusten" (esim. datan haun) suorittamisen komponentin renderöinnin yhteydessä.
import { useEffect, useState } from 'react'

// Tuodaan aiemmin luotu (lib/supabaseClient.js-tiedostossa), valmiiksi konfiguroitu Supabase-client-olio.
import { supabase } from './lib/supabaseClient'

// Määritellään App-niminen React-komponentti (funktio, joka palauttaa UI:n).
function App() {
  // Luodaan tila-muuttuja muscleGroups, alkuarvo tyhjä taulukko.
  // setMuscleGroups on funktio, jolla tätä arvoa päivitetään myöhemmin.
  const [muscleGroups, setMuscleGroups] = useState([])

  // Luodaan tila-muuttuja error, alkuarvo null (ei virhettä).
  // setError on funktio, jolla tätä arvoa päivitetään myöhemmin.
  const [error, setError] = useState(null)

  // useEffect ajaa sisällään olevan koodin kerran, kun komponentti näytetään ensimmäistä kertaa
  // (tyhjä riippuvuustaulukko [] lopussa tarkoittaa "aja vain kerran, ei uudelleen").
  useEffect(() => {
    // Määritellään async-funktio, koska Supabase-kysely on asynkroninen (kestää hetken, ei valmistu heti).
    async function fetchMuscleGroups() {
      // Odotetaan (await) Supabase-kyselyn valmistumista:
      // haetaan kaikki (*) rivit muscle_groups-taulusta, järjestettynä nimen mukaan.
      // Tulos puretaan suoraan kahdeksi muuttujaksi: data (rivit) ja error (mahdollinen virhe).
      const { data, error } = await supabase
        .from('muscle_groups')
        .select('*')
        .order('name')

      // Jos kysely palautti virheen, tallennetaan virheviesti error-tilaan.
      if (error) {
        setError(error.message)
      } else {
        // Muuten tallennetaan haettu data muscleGroups-tilaan.
        setMuscleGroups(data)
      }
    }

    // Kutsutaan yllä määriteltyä funktiota, jotta haku oikeasti käynnistyy.
    fetchMuscleGroups()
  }, []) // Tyhjä riippuvuustaulukko: efekti ajetaan vain kerran komponentin ensimmäisellä renderöinnillä.

  // Tämä on komponentin palauttama UI (JSX-syntaksia, muistuttaa HTML:ää).
  return (
    <div>
      {/* Otsikko, näytetään aina */}
      <h1>Supabase-yhteystesti</h1>

      {/* Näytetään virheviesti punaisella VAIN jos error-muuttuja ei ole tyhjä/null. */}
      {error && <p style={{ color: 'red' }}>Virhe: {error}</p>}

      {/* Lista, joka käy läpi muscleGroups-taulukon jokaisen alkion (mg) */}
      <ul>
        {muscleGroups.map((mg) => (
          // Luodaan yksi <li>-elementti per lihasryhmä.
          // key={mg.id} auttaa Reactia seuraamaan listan alkioita tehokkaasti (pakollinen listoissa).
          <li key={mg.id}>{mg.name}</li>
        ))}
      </ul>
    </div>
  )
}

// Tehdään App-komponentista muiden tiedostojen käytettävissä oleva (esim. main.jsx tarvitsee tämän).
export default App