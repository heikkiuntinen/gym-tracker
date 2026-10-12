// Tuodaan useEffect ja useState Reactin peruskirjastosta.
import { useEffect, useState } from 'react'
// Tuodaan valmiiksi konfiguroitu Supabase-client-olio.
import { supabase } from './lib/supabaseClient'

// Apufunktio: näyttää "3" jos min=max, tai "3–5" jos ne eroavat.
function formatRange(min, max) {
  return min === max ? `${min}` : `${min}–${max}`
}

// Määritellään Workout-niminen React-komponentti.
function Workout() {
  // Lista ohjelmista, joista treenin voi aloittaa.
  const [routines, setRoutines] = useState([])
  // Käynnissä oleva treeni (completed_at on tyhjä), tai null jos treeniä ei ole käynnissä.
  const [workout, setWorkout] = useState(null)
  // Käynnissä olevan treenin ohjelman liikkeet tavoitteineen.
  const [items, setItems] = useState([])
  // Käynnissä olevaan treeniin kirjatut sarjat.
  const [sets, setSets] = useState([])
  // Jokaisen liikkeen syöttökentät omana oliona, avaimena exercise_id: { weight, reps }.
  const [inputs, setInputs] = useState({})
  // Virheviesti ja latauksen tila.
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Haetaan käynnissä oleva treeni ja ohjelmalista kerran latautuessa.
  useEffect(() => {
    fetchActiveWorkout()
    fetchRoutines()
  }, [])

  // Hakee ohjelmat (id ja nimi riittävät aloitusnappeihin).
  async function fetchRoutines() {
    const { data, error } = await supabase
      .from('routines')
      .select('id, name')
      .order('name')

    if (error) setError(error.message)
    else setRoutines(data)
  }

  // Hakee käynnissä olevan treenin sekä sen liikkeet ja sarjat.
  async function fetchActiveWorkout() {
    // Käynnissä oleva treeni = rivi, jonka completed_at on tyhjä.
    // maybeSingle palauttaa null, jos riviä ei ole.
    const { data: active, error: workoutError } = await supabase
      .from('workouts')
      .select('id, routine_id, routine_name, started_at')
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (workoutError) {
      setError(workoutError.message)
      return
    }

    // Jos treeniä ei ole käynnissä, tyhjennetään näkymä.
    if (!active) {
      setWorkout(null)
      setItems([])
      setSets([])
      return
    }

    // Haetaan ohjelman liikkeet tavoitteineen. Jos ohjelma on poistettu (routine_id tyhjä),
    // liikelistaa ei ole, ja treenin voi vain päättää tai perua.
    let routineItems = []
    if (active.routine_id) {
      const { data, error: itemsError } = await supabase
        .from('routine_exercises')
        .select('id, position, target_sets_min, target_sets_max, target_reps_min, target_reps_max, exercises ( id, name )')
        .eq('routine_id', active.routine_id)
        .order('position')

      if (itemsError) {
        setError(itemsError.message)
        return
      }
      routineItems = data
    }

    // Haetaan tähän treeniin jo kirjatut sarjat.
    const { data: loggedSets, error: setsError } = await supabase
      .from('sets')
      .select('id, exercise_id, set_number, weight_kg, reps')
      .eq('workout_id', active.id)
      .order('set_number')

    if (setsError) {
      setError(setsError.message)
      return
    }

    setWorkout(active)
    setItems(routineItems)
    setSets(loggedSets)
  }

  // Aloittaa uuden treenin valitusta ohjelmasta.
  async function handleStart(routine) {
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Tallennetaan ohjelman nimi treenille itselleen, jotta historia säilyy vaikka ohjelma poistettaisiin.
    // started_at täyttyy automaattisesti (default now()), completed_at jää tyhjäksi.
    const { error } = await supabase
      .from('workouts')
      .insert({ routine_id: routine.id, routine_name: routine.name, user_id: user.id })

    if (error) setError(error.message)
    else await fetchActiveWorkout()

    setLoading(false)
  }

  // Päivittää yhden liikkeen syöttökentän arvon.
  function updateInput(exerciseId, field, value) {
    setInputs((prev) => ({
      // Säilytetään muiden liikkeiden kentät sellaisenaan.
      ...prev,
      // Päivitetään vain tämän liikkeen kenttä.
      [exerciseId]: { ...(prev[exerciseId] || { weight: '', reps: '' }), [field]: value },
    }))
  }

  // Tallentaa yhden sarjan (paino x toistot) valitulle liikkeelle.
  async function handleAddSet(e, exerciseId) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const input = inputs[exerciseId] || { weight: '', reps: '' }

    // Sarjan numero: tämän liikkeen suurin kirjattu numero + 1.
    const numbers = sets.filter((s) => s.exercise_id === exerciseId).map((s) => s.set_number)
    const nextNumber = numbers.length === 0 ? 1 : Math.max(...numbers) + 1

    const { error } = await supabase
      .from('sets')
      .insert({
        workout_id: workout.id,
        exercise_id: exerciseId,
        user_id: user.id,
        set_number: nextNumber,
        weight_kg: Number(input.weight),
        reps: Number(input.reps),
      })

    if (error) {
      setError(error.message)
    } else {
      // Tyhjennetään vain toistot; paino jää, koska seuraava sarja on usein samalla painolla.
      updateInput(exerciseId, 'reps', '')
      await fetchActiveWorkout()
    }

    setLoading(false)
  }

  // Poistaa yksittäisen sarjan (esim. jos kirjasit väärän arvon).
  async function handleDeleteSet(setId) {
    setError(null)

    const { error } = await supabase.from('sets').delete().eq('id', setId)

    if (error) setError(error.message)
    else fetchActiveWorkout()
  }

  // Merkitsee treenin valmiiksi asettamalla completed_at-ajan.
  async function handleFinish() {
    setError(null)

    const { error } = await supabase
      .from('workouts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', workout.id)

    if (error) setError(error.message)
    else fetchActiveWorkout()
  }

  // Peruu treenin: poistaa workout-rivin, ja cascade poistaa siihen kirjatut sarjat.
  async function handleCancel() {
    if (!window.confirm('Perutaanko treeni? Siihen kirjatut sarjat poistetaan.')) return
    setError(null)

    const { error } = await supabase.from('workouts').delete().eq('id', workout.id)

    if (error) setError(error.message)
    else fetchActiveWorkout()
  }

  // Komponentin palauttama UI.
  return (
    <div>
      <h2>Treeni</h2>

      {/* Näytetään virheviesti punaisella, jos error sisältää jotain */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Ei käynnissä olevaa treeniä: näytetään aloitusnapit jokaiselle ohjelmalle */}
      {!workout && (
        <div>
          <p>Valitse ohjelma:</p>
          {routines.map((r) => (
            <button key={r.id} type="button" disabled={loading} onClick={() => handleStart(r)}>
              Aloita {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Käynnissä oleva treeni: liikkeet, kirjatut sarjat ja syöttölomakkeet */}
      {workout && (
        <div>
          <h3>{workout.routine_name}</h3>

          {items.map((item) => {
            // Tämän liikkeen kirjatut sarjat ja syöttökenttien arvot.
            const exerciseSets = sets.filter((s) => s.exercise_id === item.exercises.id)
            const input = inputs[item.exercises.id] || { weight: '', reps: '' }

            return (
              <div key={item.id} style={{ border: '1px solid #ccc', margin: '12px 0', padding: '8px' }}>
                <strong>{item.exercises.name}</strong>
                {' '}
                (tavoite {formatRange(item.target_sets_min, item.target_sets_max)} × {formatRange(item.target_reps_min, item.target_reps_max)})

                <ul>
                  {exerciseSets.map((s) => (
                    <li key={s.id}>
                      Sarja {s.set_number}: {s.weight_kg} kg × {s.reps}
                      {' '}
                      <button type="button" onClick={() => handleDeleteSet(s.id)}>Poista</button>
                    </li>
                  ))}
                </ul>

                {/* Lomake yhden sarjan kirjaamiseen tälle liikkeelle */}
                <form onSubmit={(e) => handleAddSet(e, item.exercises.id)}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="kg"
                    value={input.weight}
                    onChange={(e) => updateInput(item.exercises.id, 'weight', e.target.value)}
                    required
                    style={{ width: '70px' }}
                  />
                  {' × '}
                  <input
                    type="number"
                    min="1"
                    placeholder="toistot"
                    value={input.reps}
                    onChange={(e) => updateInput(item.exercises.id, 'reps', e.target.value)}
                    required
                    style={{ width: '70px' }}
                  />
                  {' '}
                  <button type="submit" disabled={loading}>Kirjaa sarja</button>
                </form>
              </div>
            )
          })}

          <button type="button" onClick={handleFinish}>Valmis</button>
          {' '}
          <button type="button" onClick={handleCancel}>Peruuta treeni</button>
        </div>
      )}
    </div>
  )
}

// Tehdään Workout-komponentista muiden tiedostojen (App.jsx) käytettävissä oleva.
export default Workout