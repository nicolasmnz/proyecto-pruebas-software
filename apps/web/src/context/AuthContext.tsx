import {createContext,useContext,useState} from "react";
import type {ReactNode} from "react";
import type {User} from "../types/user";


interface AuthContextType {
    user: User | null;
    loginUser: (user: User) => void;
    logout: () => void;
}


const AuthContext =
    createContext<AuthContextType | undefined>(
        undefined
    );


export function AuthProvider({
    children
}: {
    children: ReactNode;
}) {

    const [user, setUser] =
        useState<User | null>(() => {

            const stored =
                localStorage.getItem("user");

            if (!stored) {
                return null;
            }

            return JSON.parse(stored);
        });


    function loginUser(user: User) {
        localStorage.setItem(
            "user",
            JSON.stringify(user)
        );

        setUser(user);
    }


    function logout() {
        localStorage.removeItem("user");

        setUser(null);
    }


    return (
        <AuthContext.Provider
            value={{
                user,
                loginUser,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth debe utilizarse dentro de AuthProvider"
        );
    }

    return context;
}