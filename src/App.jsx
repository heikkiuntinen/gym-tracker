import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './Auth'

function App() {
  // Tallennetaan kirjautuneen käyttäjän istunto (session). 
  // null = ei kirjautunut, olio = kirjautunut ja sisältää mm. käyttäjän tiedot.
  const [session, setSession] = useState(null)

  // Tila, joka kertoo onko sovellus vielä tarkistamassa alkutilaa
  // (estää välähdyksen kirjautumislomakkeesta ennen kuin oikea tila on selvillä).
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Haetaan nykyinen istunto heti kun sovellus latautuu 
    // (esim. jos käyttäjä oli jo kirjautunut edellisellä kerralla, istunto löytyy selaimen muistista).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Rekisteröidään kuuntelija, joka ajetaan AINA kun kirjautumistila muuttuu
    // (kirjaudutaan sisään, kirjaudutaan ulos, istunto vanhenee jne.).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    // Siivousfunktio: lopetetaan kuuntelu kun komponentti poistuu käytöstä,
    // ettei jää turhia kuuntelijoita muistiin.
    return () => subscription.unsubscribe()
  }, [])

  // Kirjautumisen tarkistus on vielä kesken - näytetään yksinkertainen latausviesti.
  if (loading) {
    return <p>Ladataan...</p>
  }

  // Ei istuntoa = ei kirjautunut -> näytetään kirjautumislomake.
  if (!session) {
    return <Auth />
  }

  // Session olemassa = kirjautunut -> näytetään varsinainen sovellus.
  return (
    <div>
      <h1>Painopäiväkirja</h1>
      <p>Kirjauduit sisään: {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Kirjaudu ulos</button>
    </div>
  )
}

export default App