// Tuodaan useEffect ja useState Reactin peruskirjastosta.
import { useEffect, useState } from 'react'
// Tuodaan valmiiksi konfiguroitu Supabase-client-olio.
import { supabase } from './lib/supabaseClient'

// Lomakkeen oletusarvot, joita käytetään kun ohjelman lomaketta ei ole vielä muokattu.
const DEFAULT_FORM = {
  exerciseId: '',
  setsMin: 3,
  setsMax: 3,
  repsMin: 5,
  repsMax: 5,
}

// Määritellään Routines-niminen React-komponentti.
function Routines() {
  // Lista kirjautuneen käyttäjän omista ohjelmista (routines-taulusta, liikkeineen).
  const [routines, setRoutines] = useState([])
  // Lista kirjautuneen käyttäjän omista liikkeistä (pudotusvalikkoa varten).
  const [exercises, setExercises] = useState([])
  // Virheviesti, näytetään käyttäjälle jos jokin epäonnistuu.
  const [error, setError] = useState(null)
  // Kertoo onko jokin pyyntö parhaillaan kesken (napin lukitsemiseen).
  const [loading, setLoading] = useState(false)

  // Uuden ohjelman nimen tila (esim. "Treeni A").
  const [newRoutineName, setNewRoutineName] = useState('')

  // Jokaisen ohjelman lisäyslomakkeen arvot omana oliona, avaimena ohjelman id.
  // Näin jokainen ohjelma muistaa omat arvonsa muista riippumatta.
  const [forms, setForms] = useState({})

  // Ajetaan kerran komponentin latautuessa: haetaan sekä ohjelmat että liikkeet.
  useEffect(() => {
    fetchRoutines()
    fetchExercises()
  }, [])

  // Palauttaa annetun ohjelman lomakkeen arvot, tai oletusarvot jos niitä ei ole vielä asetettu.
  function getForm(routineId) {
    return forms[routineId] || DEFAULT_FORM
  }

  // Päivittää yhden kentän (field) arvon yhden ohjelman lomakkeessa.
  function updateForm(routineId, field, value) {
    // prev on tilan edellinen arvo; näin päivitys perustuu aina tuoreeseen tilaan.
    setForms((prev) => ({
      // Kopioidaan kaikkien muiden ohjelmien lomakkeet sellaisenaan.
      ...prev,
      // Korvataan vain tämän ohjelman lomake: vanhat arvot + muutettu kenttä.
      [routineId]: { ...(prev[routineId] || DEFAULT_FORM), [field]: value },
    }))
  }

  // Hakee kirjautuneen käyttäjän liikkeet (id ja nimi riittävät pudotusvalikkoon).
  async function fetchExercises() {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name')
      .order('name')

    // Jos haku epäonnistui, tallennetaan virhe; muuten tallennetaan haettu data.
    if (error) setError(error.message)
    else setExercises(data)
  }

  // Hakee kirjautuneen käyttäjän ohjelmat, ja jokaisen ohjelman liikkeet samassa kyselyssä.
  async function fetchRoutines() {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        id,
        name,
        routine_exercises (
          id,
          target_sets_min,
          target_sets_max,
          target_reps_min,
          target_reps_max,
          position,
          exercises ( id, name )
        )
      `)
      // Uusin ohjelma näytetään ensin.
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setRoutines(data)
  }

  // Kutsutaan kun "Luo ohjelma" -lomake lähetetään.
  async function handleCreateRoutine(e) {
    // Estetään selaimen oletustoiminto (sivun uudelleenlataus).
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Haetaan kirjautuneen käyttäjän tiedot, jotta saadaan user_id insertiä varten.
    const { data: { user } } = await supabase.auth.getUser()

    // Lisätään uusi rivi routines-tauluun annetulla nimellä.
    const { error } = await supabase
      .from('routines')
      .insert({ name: newRoutineName, user_id: user.id })

    if (error) {
      setError(error.message)
    } else {
      // Tyhjennetään lomakkeen kenttä ja haetaan ohjelmat uudelleen, jotta uusi näkyy heti.
      setNewRoutineName('')
      fetchRoutines()
    }

    setLoading(false)
  }

  // Kutsutaan kun jonkin ohjelman liikkeenlisäyslomake lähetetään.
  // routineId kertoo suoraan mihin ohjelmaan lisätään, joten erillistä "valittu ohjelma" -tilaa ei tarvita.
  async function handleAddExerciseToRoutine(e, routineId) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Haetaan tämän ohjelman lomakkeen arvot.
    const form = getForm(routineId)
    // Etsitään se ohjelma-olio, johon liikettä ollaan lisäämässä.
    const routine = routines.find((r) => r.id === routineId)
    // Seuraava position: suurin nykyinen + 1 (tai 1, jos ohjelma on vielä tyhjä).
    // Näin järjestys pysyy oikeana, vaikka välistä olisi poistettu liike.
    const positions = routine.routine_exercises.map((re) => re.position)
    const nextPosition = positions.length === 0 ? 1 : Math.max(...positions) + 1

    // Lisätään uusi rivi routine_exercises-tauluun kaikilla tarvittavilla tiedoilla.
    const { error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: routineId,
        exercise_id: form.exerciseId,
        user_id: user.id,
        target_sets_min: form.setsMin,
        target_sets_max: form.setsMax,
        target_reps_min: form.repsMin,
        target_reps_max: form.repsMax,
        position: nextPosition,
      })

    if (error) {
      setError(error.message)
    } else {
      // Tyhjennetään vain valittu liike; sarja- ja toistoarvot jäävät paikalleen,
      // koska seuraavalla liikkeellä on usein samat tavoitteet.
      updateForm(routineId, 'exerciseId', '')
      fetchRoutines()
    }

    setLoading(false)
  }

  // Poistaa yksittäisen liikkeen ohjelmasta (vain routine_exercises-rivi, ei kosketa sets-historiaan).
  async function handleRemoveExercise(routineExerciseId) {
    setError(null)

    // Poistetaan rivi, jonka id täsmää annettuun arvoon.
    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', routineExerciseId)

    // Virheessä näytetään viesti, muuten päivitetään lista.
    if (error) setError(error.message)
    else fetchRoutines()
  }

  // Poistaa koko ohjelman. Kysytään varmistus, koska poisto on pysyvä.
  async function handleDeleteRoutine(routineId, routineName) {
    // Jos käyttäjä peruuttaa varmistuksen, poistutaan funktiosta tekemättä mitään.
    if (!window.confirm(`Poistetaanko ohjelma "${routineName}"?`)) return
    setError(null)

    // Poistetaan ohjelma; cascade poistaa samalla sen routine_exercises-rivit.
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)

    if (error) setError(error.message)
    else fetchRoutines()
  }

  // Apufunktio: näyttää "3" jos min=max, tai "3–5" jos ne eroavat.
  function formatRange(min, max) {
    return min === max ? `${min}` : `${min}–${max}`
  }

  // Komponentin palauttama UI.
  return (
    <div>
      <h2>Ohjelmat</h2>

      {/* Lomake uuden, tyhjän ohjelman luomiseen */}
      <form onSubmit={handleCreateRoutine}>
        <label htmlFor="routineName">Uuden ohjelman nimi</label>
        <br />
        <input
          id="routineName"
          type="text"
          value={newRoutineName}
          onChange={(e) => setNewRoutineName(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>Luo ohjelma</button>
      </form>

      {/* Näytetään virheviesti punaisella, jos error sisältää jotain */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Käydään läpi jokainen ohjelma ja piirretään sille oma lohkonsa */}
      {routines.map((routine) => {
        // Haetaan tämän ohjelman oma lomakkeen tila (tai oletusarvot).
        const form = getForm(routine.id)

        return (
          <div key={routine.id} style={{ border: '1px solid #ccc', margin: '12px 0', padding: '8px' }}>
            {/* Ohjelman nimi ja ohjelman poistonappi */}
            <h3>
              {routine.name}{' '}
              <button type="button" onClick={() => handleDeleteRoutine(routine.id, routine.name)}>
                Poista ohjelma
              </button>
            </h3>

            <ul>
              {/* Kopioidaan taulukko [...] ennen järjestämistä, ettei alkuperäistä dataa muuteta paikallaan */}
              {[...routine.routine_exercises]
                // Järjestetään liikkeet position-sarakkeen mukaan (pienimmästä suurimpaan)
                .sort((a, b) => a.position - b.position)
                .map((re) => (
                  <li key={re.id}>
                    {/* Näytetään liikkeen nimi, sekä sarjat ja toistot formatRange-funktiolla muotoiltuna */}
                    {re.exercises.name}: {formatRange(re.target_sets_min, re.target_sets_max)} × {formatRange(re.target_reps_min, re.target_reps_max)}
                    {' '}
                    {/* Poistaa tämän liikkeen ohjelmasta */}
                    <button type="button" onClick={() => handleRemoveExercise(re.id)}>
                      Poista
                    </button>
                  </li>
                ))}
            </ul>

            {/* Lomake, jolla lisätään liike juuri tähän ohjelmaan.
                Nuolifunktio välittää ohjelman id:n käsittelijälle. */}
            <form onSubmit={(e) => handleAddExerciseToRoutine(e, routine.id)}>
              <select
                value={form.exerciseId}
                onChange={(e) => updateForm(routine.id, 'exerciseId', e.target.value)}
                required
              >
                <option value="">-- Valitse liike --</option>
                {/* Luodaan yksi <option> per liike käyttäjän liikelistasta */}
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>

              <br />
              Sarjat:
              {/* Sarjojen alaraja-kenttä */}
              <input
                type="number"
                value={form.setsMin}
                onChange={(e) => updateForm(routine.id, 'setsMin', Number(e.target.value))}
                min="1"
                style={{ width: '50px' }}
              />
              –
              {/* Sarjojen yläraja-kenttä */}
              <input
                type="number"
                value={form.setsMax}
                onChange={(e) => updateForm(routine.id, 'setsMax', Number(e.target.value))}
                min="1"
                style={{ width: '50px' }}
              />

              <br />
              Toistot:
              {/* Toistojen alaraja-kenttä */}
              <input
                type="number"
                value={form.repsMin}
                onChange={(e) => updateForm(routine.id, 'repsMin', Number(e.target.value))}
                min="1"
                style={{ width: '50px' }}
              />
              –
              {/* Toistojen yläraja-kenttä */}
              <input
                type="number"
                value={form.repsMax}
                onChange={(e) => updateForm(routine.id, 'repsMax', Number(e.target.value))}
                min="1"
                style={{ width: '50px' }}
              />

              <br />
              {/* Nappi on pois käytöstä kun loading on true (pyyntö kesken) */}
              <button type="submit" disabled={loading}>
                Lisää liike ohjelmaan
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}

// Tehdään Routines-komponentista muiden tiedostojen (App.jsx) käytettävissä oleva.
export default Routines