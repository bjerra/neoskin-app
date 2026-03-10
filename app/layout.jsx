'use client'

import '../styles/globals.css';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { useEffect, useState } from 'react';
import { Login } from 'components/login';

export default function RootLayout({ children }) {

    const [user, setUser] = useState(null);

  useEffect(() => {
    // Load the script dynamically if not already present
    if (!document.getElementById('netlify-identity-widget-script')) {
      const script = document.createElement('script');
      script.id = 'netlify-identity-widget-script';
      script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // Now window.netlifyIdentity is available
        window.netlifyIdentity?.init();

        // Optional: Check user immediately after load

        setUser(window.netlifyIdentity?.currentUser())
      };
    }

    // Event listeners (use window.netlifyIdentity)
    const handleLogin = (user) => {
      if (user) {
         setUser(user)
      }
    };

    const handleLogout = () => {
        setUser(null)
    };

    window.netlifyIdentity?.on('login', handleLogin);
    window.netlifyIdentity?.on('logout', handleLogout);

    return () => {
      window.netlifyIdentity?.off('login', handleLogin);
      window.netlifyIdentity?.off('logout', handleLogout);
    };
  }, []);


    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
                <body className="antialiased text-white bg-blue-900">
                    <div className="flex flex-col min-h-screen px-6 bg-noise sm:px-12">
                        <div className="flex flex-col w-full max-w-5xl mx-auto grow">
                            {user ? (
                                <>            
                                <Header user/>
                                <main className="grow">{children}</main>
                                <Footer />     
                                </>
                            ) : (
                                <Login />
                            )}
                        </div>
                    </div>
                </body>
            
        </html>
    );
}
