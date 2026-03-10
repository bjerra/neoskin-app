
export function Login() {

    const login = () => {
        window.netlifyIdentity?.open()
    };

    return (
        <div className="pt-16 pb-12 sm:pt-24 sm:pb-16">
           <button onClick={login}>Log in</button>
        </div>
    );
}
