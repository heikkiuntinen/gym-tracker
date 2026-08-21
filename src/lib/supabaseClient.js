// Tuodaan createClient-funktio @supabase/supabase-js -kirjastosta.
// createClient-funktio rakentaa yhteyden Supabase-projektiin.
import { createClient } from '@supabase/supabase-js'

// import.meta.env on Viten tapa päästä käsiksi ympäristömuuttujiin selainkoodissa.
// .VITE_SUPABASE_URL viittaa vastaavaan .env-tiedoston riviin.
// Nämä tarkoittavat: "hae URL-osoite, jonka kirjoitin .env-tiedostoon ja laita se supabaseUrl-nimiseen muuttujaan käytettäväksi"
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

// Sama periaate kuin edellisellä kohdalla, mutta haetaan API-avain.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Kutsutaan rakennusfunktiota createClient ja annetaan sille URL ja API-avain parametreina.
// Funktio palauttaa valmiin client-olion, joka tietää nyt mihin Supabase-projektiin se on yhteydessä ja millä oikeuksilla.
// Client-olio tallennetaan muuttujaan const supabase.
// export tekee tästä supabase-muuttujasta muiden tiedostojen käytettävissä olevan. Exportin avulla muut tiedostot voivat tuoda sen käyttöönsä import-lauseella.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)