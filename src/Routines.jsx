// Tuodaan useEffect ja useState Reactin peruskirjastosta.
import { useEffect, useState } from 'react'
// Tuodaan valmiiksi konfiguroitu Supabase-client-olio.
import { supabase } from './lib/supabaseClient'

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

  // Kertoo mihin ohjelmaan ollaan juuri nyt lisäämässä liikettä.
  const [selectedRoutineId, setSelectedRoutineId] = useState(null)
  // Kertoo mikä liike on valittuna lisättäväksi.
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  // Min/max-parit yksittäisten arvojen sijaan.
  // Sarjojen tavoitteen alaraja, oletusarvo 3.
  const [targetSetsMin, setTargetSetsMin] = useState(3)
  // Sarjojen tavoitteen yläraja, oletusarvo 3 (kiinteä arvo, koska min=max).
  const [targetSetsMax, setTargetSetsMax] = useState(3)
  // Toistojen tavoitteen alaraja, oletusarvo 5.
  const [targetRepsMin, setTargetRepsMin] = useState(5)
  // Toistojen tavoitteen yläraja, oletusarvo 5 (kiinteä arvo, koska min=max).
  const [targetRepsMax, setTargetRepsMax] = useState(5)

  // Ajetaan kerran komponentin latautuessa: haetaan sekä ohjelmat että liikkeet.
  useEffect(() => {
    fetchRoutines()
    fetchExercises()
  }, [])

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

  // Kutsutaan kun liikkeen lisäyslomake (jokaisen ohjelman alla) lähetetään.
  async function handleAddExerciseToRoutine(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Etsitään se ohjelma-olio, johon liikettä ollaan lisäämässä.
    const routine = routines.find((r) => r.id === selectedRoutineId)
    // Lasketaan seuraava position-arvo: nykyisten liikkeiden määrä + 1.
    const nextPosition = routine.routine_exercises.length + 1

    // Lisätään uusi rivi routine_exercises-tauluun kaikilla tarvittavilla tiedoilla.
    const { error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: selectedRoutineId,
        exercise_id: selectedExerciseId,
        user_id: user.id,
        target_sets_min: targetSetsMin,
        target_sets_max: targetSetsMax,
        target_reps_min: targetRepsMin,
        target_reps_max: targetRepsMax,
        position: nextPosition,
      })

    if (error) {
      setError(error.message)
    } else {
      // Tyhjennetään valittu liike ja haetaan ohjelmat uudelleen, jotta lisäys näkyy heti.
      setSelectedExerciseId('')
      fetchRoutines()
    }

    setLoading(false)
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
      {routines.map((routine) => (
        <div key={routine.id} style={{ border: '1px solid #ccc', margin: '12px 0', padding: '8px' }}>
          <h3>{routine.name}</h3>

          <ul>
            {/* Kopioidaan taulukko [...] ennen järjestämistä, ettei alkuperäistä dataa muuteta paikallaan */}
            {[...routine.routine_exercises]
              // Järjestetään liikkeet position-sarakkeen mukaan (pienimmästä suurimpaan)
              .sort((a, b) => a.position - b.position)
              .map((re) => (
                <li key={re.id}>
                  {/* Näytetään liikkeen nimi, sekä sarjat ja toistot formatRange-funktiolla muotoiltuna */}
                  {re.exercises.name}: {formatRange(re.target_sets_min, re.target_sets_max)} × {formatRange(re.target_reps_min, re.target_reps_max)}
                </li>
              ))}
          </ul>

          {/* Lomake, jolla lisätään liike juuri tähän ohjelmaan */}
          <form onSubmit={handleAddExerciseToRoutine}>
            <select
              // Näytetään valittu liike vain jos ollaan lisäämässä juuri tähän ohjelmaan,
              // muuten pudotusvalikko näyttää tyhjän valinnan.
              value={selectedRoutineId === routine.id ? selectedExerciseId : ''}
              onChange={(e) => {
                // Tallennetaan sekä mihin ohjelmaan lisätään että mikä liike valittiin.
                setSelectedRoutineId(routine.id)
                setSelectedExerciseId(e.target.value)
              }}
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
              value={targetSetsMin}
              onChange={(e) => setTargetSetsMin(Number(e.target.value))}
              min="1"
              style={{ width: '50px' }}
            />
            –
            {/* Sarjojen yläraja-kenttä */}
            <input
              type="number"
              value={targetSetsMax}
              onChange={(e) => setTargetSetsMax(Number(e.target.value))}
              min="1"
              style={{ width: '50px' }}
            />

            <br />
            Toistot:
            {/* Toistojen alaraja-kenttä */}
            <input
              type="number"
              value={targetRepsMin}
              onChange={(e) => setTargetRepsMin(Number(e.target.value))}
              min="1"
              style={{ width: '50px' }}
            />
            –
            {/* Toistojen yläraja-kenttä */}
            <input
              type="number"
              value={targetRepsMax}
              onChange={(e) => setTargetRepsMax(Number(e.target.value))}
              min="1"
              style={{ width: '50px' }}
            />

            <br />
            {/* Nappi on pois käytöstä kun loading on true (pyyntö kesken) */}
            {/* onClick varmistaa, että selectedRoutineId on oikein asetettu myös silloin */}
            {/* kun pudotusvalikkoa ei ole vielä kosketettu tässä ohjelmassa */}
            <button
              type="submit"
              disabled={loading}
              onClick={() => setSelectedRoutineId(routine.id)}
            >
              Lisää liike ohjelmaan
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}

// Tehdään Routines-komponentista muiden tiedostojen (App.jsx) käytettävissä oleva.
export default Routines