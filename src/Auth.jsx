// Tuodaan useState, jotta voidaan tallentaa lomakkeen kenttien arvot.
import { useState } from 'react'
// Tuodaan Supabase-client, jotta voidaan kutsua Auth-toimintoja.
import { supabase } from './lib/supabaseClient'

function Auth() {
  // Lomakkeen kentät omina tiloinaan.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Tila sille, ollaanko kirjautumassa vai rekisteröitymässä (sama lomake, kaksi tilaa).
  const [isSignUp, setIsSignUp] = useState(false)

  // Virhe- ja latausviestit käyttäjälle.
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Kutsutaan kun lomake lähetetään (nappia painetaan).
  async function handleSubmit(e) {
    // Estetään selaimen oletustoiminto (sivun uudelleenlataus lomakkeen lähetyksessä).
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Valitaan kutsuttava Supabase-funktio sen mukaan kumpi tila on päällä.
    // supabase.auth.signUp({ email, password }) luo uuden tilin ja lähettää ne supabaseen
    // supabase.auth.signInWithPassword({ email, password }) etsii aikaisemmin luodun tilin,
    // laskee annetusta salasanasta tiivisteen ja vertaa sitä tallennettuun tiivisteeseen.
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    }
    // Huom: onnistuneen kirjautumisen jälkeen ei tarvitse tehdä täällä mitään muuta -
    // App.jsx:ssä oleva onAuthStateChange-kuuntelija huomaa muutoksen automaattisesti.

    setLoading(false)
  }

  return (
    <div>
      <h1>Painopäiväkirja</h1>

      {/* Otsikko vaihtuu sen mukaan kummassa tilassa lomake on: rekisteröinti vai kirjautuminen */}
      <h2>{isSignUp ? 'Luo tili' : 'Kirjaudu sisään'}</h2>

      {/* onSubmit kutsuu handleSubmit-funktiota, kun lomake lähetetään (esim. Enter tai nappia painamalla) */}
      <form onSubmit={handleSubmit}>
        <div>
          {/* htmlFor="email" yhdistää tämän labelin input-kenttään, jonka id on "email" - */}
          {/* tämä on saavutettavuuden kannalta tärkeää (ruudunlukijat, klikkaus labelista fokusoi kentän) */}
          <label htmlFor="email">Sähköposti</label>
          <br />
          <input
            id="email"
            type="email"
            // Kentän arvo on aina se, mitä email-tilassa on tallennettuna (kontrolloitu komponentti)
            value={email}
            // Joka kerta kun käyttäjä kirjoittaa, päivitetään email-tila uudella arvolla
            onChange={(e) => setEmail(e.target.value)}
            // Selain estää lomakkeen lähetyksen, jos kenttä on tyhjä
            required
          />
        </div>

        <div>  
          <br />  
          <label htmlFor="password">Salasana</label>
          <br />
          <input
            id="password"
            // type="password" piilottaa kirjoitetut merkit pisteinä/tähtinä
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            // Selain estää lähetyksen, jos salasana on alle 6 merkkiä (Supabasen oma minimivaatimus)
            minLength={6}
          />
        </div>

        {/* Näytetään virheviesti punaisella VAIN jos error-muuttuja sisältää jotain (ei null) */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Nappi on pois käytöstä (disabled) kun loading on true, ettei käyttäjä voi lähettää lomaketta uudelleen kesken pyynnön */}
        {/* Napin teksti vaihtuu tilanteen mukaan: odotustila, tai "Luo tili"/"Kirjaudu" riippuen isSignUp-tilasta */}
        <br />
        <button type="submit" disabled={loading}>
          {loading ? 'Odota...' : isSignUp ? 'Luo tili' : 'Kirjaudu'}
        </button>
      </form>

      {/* Erillinen nappi (ei submit-tyyppinen), joka vaihtaa isSignUp-tilan päinvastaiseksi klikattaessa - */}
      {/* näin sama lomake vaihtuu rekisteröinti- ja kirjautumistilan välillä ilman erillistä sivua */}
      <button onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp
          ? 'Onko sinulla jo tili? Kirjaudu sisään'
          : 'Ei tiliä? Luo uusi'}
      </button>
    </div>
  )
}

// Tehdään Auth-komponentista muiden tiedostojen (App.jsx) käytettävissä oleva
export default Auth