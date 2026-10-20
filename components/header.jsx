import Link from 'next/link';
import { getCurrentUser } from '../utils/require-user.js';

export async function Header() {
    const user = await getCurrentUser();

    return (
        <nav className="flex flex-wrap justify-between items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
            <ul className="flex flex-wrap gap-x-10 gap-y-1">
                <li>
                    <Link href={'/'} className="inline-flex px-1.5 py-1 sm:px-3 sm:py-2 no-underline text-2xl text-[#fff] no-underline bg-gray-500 rounded-md">
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
            {user &&
                 <div>
                    <p>{user.username}</p>
                    <form action="/api/auth/logout" method="post">
                        <button
                            type="submit"
                            className={`
                        flex h-8 w-20 items-center justify-center rounded-md 
                        bg-red-200 border border-gray-300 text-gray-600 text-lg
                        hover:bg-gray-50 hover:border-gray-400 
                        disabled:opacity-50
                        transition-colors
                        `}
                        >
                            Log out
                        </button>
                    </form>
                 </div>
            }
        </nav>
    );
}
