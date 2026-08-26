// Tuodaan tarvittavat React-hookit ja Supabase-client.
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function Exercises() {
  // Lista jo tallennetuista liikkeistä.
  const [exercises, setExercises] = useState([])

  // Lista lihasryhmistä (pudotusvalikkoa varten).
  const [muscleGroups, setMuscleGroups] = useState([])

  // Lomakkeen kentät uuden liikkeen lisäämiseen.
  const [name, setName] = useState('')
  const [primaryMuscleGroupId, setPrimaryMuscleGroupId] = useState('')

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Haetaan liikkeet ja lihasryhmät heti kun komponentti latautuu.
  useEffect(() => {
    fetchMuscleGroups()
    fetchExercises()
  }, [])

  // Hakee kaikki lihasryhmät (jaettu, kiinteä data - sama kaikille käyttäjille).
  async function fetchMuscleGroups() {
    const { data, error } = await supabase
      .from('muscle_groups')
      .select('*')
      .order('name')

    if (error) {
      setError(error.message)
    } else {
      setMuscleGroups(data)
    }
  }

  // Hakee kirjautuneen käyttäjän omat liikkeet.
  // RLS suodattaa automaattisesti näkyviin vain omat rivit - ei tarvitse
  // itse lisätä "WHERE user_id = ..." -ehtoa, Supabase hoitaa sen.
  async function fetchExercises() {
    const { data, error } = await supabase
      .from('exercises')
      // select-lauseessa haetaan myös liitetyn muscle_groups-taulun nimi
      // suoraan mukaan (name-sarake primary_muscle_group_id:n kautta).
      .select('id, name, primary_muscle_group_id, muscle_groups(name)')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setExercises(data)
    }
  }

  // Lisää uuden liikkeen kun lomake lähetetään.
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Haetaan kirjautuneen käyttäjän tiedot, jotta saadaan user_id mukaan.
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('exercises')
      .insert({
        name,
        primary_muscle_group_id: primaryMuscleGroupId || null,
        user_id: user.id,
      })

    if (error) {
      setError(error.message)
    } else {
      // Tyhjennetään lomake ja haetaan lista uudelleen, jotta uusi liike näkyy heti.
      setName('')
      setPrimaryMuscleGroupId('')
      fetchExercises()
    }

    setLoading(false)
  }

  return (
    <div>
      <h2>Liikkeet</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Liikkeen nimi</label>
          <br />
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="muscleGroup">Päälihasryhmä</label>
          <br />
          <select
            id="muscleGroup"
            value={primaryMuscleGroupId}
            onChange={(e) => setPrimaryMuscleGroupId(e.target.value)}
          >
            <option value="">-- Valitse --</option>
            {muscleGroups.map((mg) => (
              <option key={mg.id} value={mg.id}>
                {mg.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Lisätään...' : 'Lisää liike'}
        </button>
      </form>

      <h3>Omat liikkeet</h3>
      <ul>
        {exercises.map((ex) => (
          <li key={ex.id}>
            {ex.name}
            {ex.muscle_groups && ` (${ex.muscle_groups.name})`}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Exercises