import Image from 'next/image';
import Link from 'next/link';
import netlifyLogo from 'public/netlify-logo.svg';
import githubLogo from 'public/images/github-mark-white.svg';

const navItems = [
    { linkText: 'Home', href: '/' },
    { linkText: 'Sälj', href: '/sell' },
    { linkText: 'Fyll på', href: '/restock' },
];

export function Header({user}) {

    const logout = () => {
        console.log("logout")
        window.netlifyIdentity?.logout()
    };
    console.log("user:" ,user);

    return (
        <nav className="flex flex-wrap items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
            <Link href="/">
                <Image src={netlifyLogo} alt="Netlify logo" />
            </Link>
            {!!navItems?.length && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {navItems.map((item, index) => (
                        <li key={index}>
                            <Link href={item.href} className="inline-flex px-1.5 py-1 sm:px-3 sm:py-2">
                                {item.linkText}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
             <p>Welcome, {user?.user_metadata?.full_name || user?.email}!</p>
            <button onClick={logout}>Log out</button>
        </nav>
    );
}
