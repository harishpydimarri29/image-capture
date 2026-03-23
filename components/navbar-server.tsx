import { createClient } from '@/lib/supabase/server'
import { Navbar } from './navbar'

export async function NavbarServer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <Navbar userEmail={user?.email ?? null} />
}
