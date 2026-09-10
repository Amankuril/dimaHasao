import React from 'react';
import { Outlet } from 'react-router-dom';
import { useLenis } from '../app/shared/hooks/useLenis';

const HotelLayout = () => {
    // Initialize global smooth scrolling
    // Lenis is initialized globally in App.jsx

    return (
        <div id="hotel-root" className="min-h-screen w-full bg-partner-bg text-partner-text-primary font-sans antialiased selection:bg-partner-btn selection:text-white">
            <main className="w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default HotelLayout;
