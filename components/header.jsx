'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation'

const navItems = [
    { linkText: 'Home', href: '/' },
    { linkText: 'Sälj', href: '/sell' },
    { linkText: 'Fyll på', href: '/restock' },
];


export function Header() {  
    const [user, setUser] = useState(null);
    const supabase = createClient();
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login')
    }

    useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getInitialSession();

    // Listen for auth changes (login, logout, etc.) — keeps UI in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const buttonStyle = "inline-flex px-1.5 py-1 sm:px-3 sm:py-2 no-underline text-2xl text-[#fff] no-underline bg-gray-500 rounded-md";
  const currentButtonStyle = "inline-flex px-1.5 py-1 sm:px-3 sm:py-2 no-underline text-2xl text-[#fff] no-underline bg-green-500 rounded-md";

    return (
        <nav className="flex flex-wrap justify-between items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
            {!!navItems?.length && (
                <ul className="flex flex-wrap gap-x-10 gap-y-1">
                    <li>
                        <Link href={'/'} className={buttonStyle}>
                           Produkter
                        </Link>
                    </li>
                     <li>
                        <Link href={'/sell'} className="inline-flex px-1.5 py-1 sm:px-3 sm:py-2 text-2xl text-[#fff] no-underline bg-green-500 rounded-md">
                            Sälj Produkt
                        </Link>
                    </li>
                     <li>
                        <Link href={'/restock'} className="inline-flex px-1.5 py-1 sm:px-3 sm:py-2 text-2xl text-[#fff] no-underline bg-blue-500 rounded-md">
                            Fyll på Lager
                        </Link>
                    </li>
                </ul>
            )}
            {user &&
                 <div>
                    <p>{user.email}</p>
                    <button className={`
                        flex h-8 w-20 items-center justify-center rounded-md 
                        bg-red-200 border border-gray-300 text-gray-600 text-lg
                        hover:bg-gray-50 hover:border-gray-400 
                        disabled:opacity-50
                        transition-colors
                        `} onClick={handleLogout}>Log out</button>
                 </div>
            }
           
           
        </nav>
    );
}
