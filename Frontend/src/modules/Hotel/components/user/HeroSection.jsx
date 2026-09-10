import React, { useState, useEffect } from 'react';
import { Search, Menu, Bell, Wallet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/rokologin-removebg-preview.png';
import MobileMenu from '../../components/ui/MobileMenu';
import { useNavigate } from 'react-router-dom';
import walletService from '../../services/walletService';

const HeroSection = ({ theme, selectedType }) => {
    const accentColor = theme?.accent || '#10B981';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isSticky, setIsSticky] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [heroApiSuggestions, setHeroApiSuggestions] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(() => {
        return localStorage.getItem('user_location') || 'Indore';
    });
    const [isLocating, setIsLocating] = useState(false);
    const searchRef = React.useRef(null);

    const MASTER_LOCATIONS = [
        // Indore Areas & Landmarks
        "Rajwada, Indore",
        "Rajendra Nagar, Indore",
        "Rajeev Gandhi Circle, Indore",
        "Raja Ramanna Centre (CAT), Indore",
        "Rajwada Chowk, Indore",
        "Vijay Nagar, Indore",
        "Palasia, Indore",
        "New Palasia, Indore",
        "Old Palasia, Indore",
        "Bhawarkua, Indore",
        "Khandwa Road, Indore",
        "Khandwa Naka, Indore",
        "LIG Colony, Indore",
        "Rau, Indore",
        "Sanwer, Indore",
        "Sanwer Road, Indore",
        "Mayakhedi, Indore",
        "Super Corridor, Indore",
        "Talawali Chanda, Indore",
        "Bhawrasla, Indore",
        "Manglia, Indore",
        "Bhicholi Mardana, Indore",
        "Geeta Bhawan, Indore",
        "AB Road, Indore",
        "Annapurna, Indore",
        "Saket, Indore",
        "Scheme 54, Indore",
        "Scheme 78, Indore",
        "Scheme 140, Indore",
        "Scheme 71, Indore",
        "Nipania, Indore",
        "Mahalakshmi Nagar, Indore",
        "Bengali Square, Indore",
        "Airport Road, Indore",
        "Mhow, Indore",
        "Sudama Nagar, Indore",
        "Khajrana, Indore",
        "Bicholi Hapsi, Indore",
        "Kanadia Road, Indore",
        "Patnipura, Indore",
        "Janapav, Indore",
        "Tower Square, Indore",
        "Chhotigaltoli, Indore",
        "Navlakha, Indore",
        "Pardesipura, Indore",
        "Clerk Colony, Indore",

        // MP Cities
        "Bhopal, Madhya Pradesh",
        "Indore, Madhya Pradesh",
        "Gwalior, Madhya Pradesh",
        "Jabalpur, Madhya Pradesh",
        "Ujjain, Madhya Pradesh",
        "Dewas, Madhya Pradesh",
        "Khandwa, Madhya Pradesh",
        "Khargone, Madhya Pradesh",
        "Ratlam, Madhya Pradesh",
        "Rewa, Madhya Pradesh",
        "Satna, Madhya Pradesh",
        "Sagar, Madhya Pradesh",
        "Singrauli, Madhya Pradesh",
        "Burhanpur, Madhya Pradesh",
        "Vidisha, Madhya Pradesh",
        "Chhindwara, Madhya Pradesh",
        "Rajgarh, Madhya Pradesh",
        "Hoshangabad, Madhya Pradesh",
        "Itarsi, Madhya Pradesh",
        "Sehore, Madhya Pradesh",
        "Neemuch, Madhya Pradesh",
        "Mandsaur, Madhya Pradesh",

        // Major Metro Cities & States
        "Delhi, NCR",
        "New Delhi",
        "Gurugram, Haryana",
        "Noida, Uttar Pradesh",
        "Mumbai, Maharashtra",
        "Pune, Maharashtra",
        "Bengaluru, Karnataka",
        "Hyderabad, Telangana",
        "Chennai, Tamil Nadu",
        "Kolkata, West Bengal",
        "Ahmedabad, Gujarat",
        "Jaipur, Rajasthan",
        "Chandigarh",
        "Lucknow, Uttar Pradesh",
        "Surat, Gujarat",
        "Nagpur, Maharashtra",
        "Vadodara, Gujarat",
        "Kota, Rajasthan",
        "Udaipur, Rajasthan",
        "Agra, Uttar Pradesh",
        "Varanasi, Uttar Pradesh",
        "Kanpur, Uttar Pradesh",
        "Patna, Bihar",
        "Ranchi, Jharkhand",
        "Raipur, Chhattisgarh"
    ];

    // Dynamic Autocomplete suggestions when user types in Hero search
    useEffect(() => {
        const query = searchQuery?.trim();
        if (!query || query.length < 2) {
            setHeroApiSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                // Photon OpenStreetMap Autocomplete (Instant, handles partial words like "raja", "khand")
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`);
                const data = await res.json();
                if (data && data.features && data.features.length > 0) {
                    const fetched = data.features.map(f => {
                        const props = f.properties;
                        const name = props.name || '';
                        const city = props.city || props.county || props.district || props.state || '';
                        if (name && city && !name.toLowerCase().includes(city.toLowerCase())) {
                            return `${name}, ${city}`;
                        }
                        return name || city;
                    }).filter(Boolean);
                    
                    if (fetched.length > 0) {
                        setHeroApiSuggestions(fetched);
                        return;
                    }
                }
            } catch (err) {
                console.warn("Photon autocomplete failed", err);
            }

            // Fallback to Google Geocode API
            const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
            if (apiKey) {
                try {
                    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&components=country:in`);
                    const data = await res.json();
                    if (data.status === 'OK' && data.results) {
                        const fetched = data.results.slice(0, 5).map(item => item.formatted_address);
                        setHeroApiSuggestions(fetched);
                    }
                } catch (err) {
                    console.warn("Google Geocoding error in HeroSection", err);
                }
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const getFilteredHeroLocations = () => {
        const query = (searchQuery || '').toLowerCase().trim();
        const localFiltered = MASTER_LOCATIONS.filter(loc => 
            !query || loc.toLowerCase().includes(query)
        );
        const combined = Array.from(new Set([...heroApiSuggestions, ...localFiltered]));
        return combined.slice(0, 8);
    };

    const categoryContent = {
        'All': { title: "", subtitle: "Your home, your way." },
        'PG/Co-Living': { title: "Scholar & Professional Stays.", subtitle: "Premium PGs and Co-living spaces designed for comfort." },
        'PG': { title: "Scholar & Professional Stays.", subtitle: "Premium PGs and Co-living spaces designed for comfort." },
        'Rent': { title: "Premium Homes for Rent.", subtitle: "Find your ideal match from chic apartments to spacious villas." },
        'Buy': { title: "Invest in your Future.", subtitle: "Discover exclusive properties and luxury estates for sale." },
        'Plot': { title: "Premium Plots in Prime Locations.", subtitle: "Build your vision on the perfect foundation." },
        'Plots': { title: "Premium Plots in Prime Locations.", subtitle: "Build your vision on the perfect foundation." }
    };

    const currentTagline = categoryContent[selectedType?.label] || categoryContent['All'];

    const placeholders = [
        "Search in Bucharest...",
        "Find luxury hotels...",
        "Book villas in Bali...",
        "Couple friendly stays...",
        "Search near Red Square..."
    ];

    // Helper for multi-provider reverse geocoding
    const reverseGeocode = async (latitude, longitude) => {
        // 1. Google Maps Geocoding API if key is available
        const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
        if (apiKey) {
            try {
                const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
                const data = await response.json();
                if (data.status === 'OK' && data.results.length > 0) {
                    const addressComponents = data.results[0].address_components;
                    const locality = addressComponents.find(c => c.types.includes('locality'));
                    const sublocality = addressComponents.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'));
                    const adminArea = addressComponents.find(c => c.types.includes('administrative_area_level_2'));
                    
                    const city = locality?.long_name || sublocality?.long_name || adminArea?.long_name || data.results[0].formatted_address.split(',')[0];
                    if (city) return city;
                }
            } catch (e) {
                console.warn("Google Geocoding failed, falling back...", e);
            }
        }

        // 2. BigDataCloud free client reverse geocoding API (Fast, free & CORS friendly)
        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            const city = data.city || data.locality || data.principalSubdivision;
            if (city) return city;
        } catch (e) {
            console.warn("BigDataCloud Geocoding failed, falling back...", e);
        }

        // 3. OpenStreetMap Nominatim fallback
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.county;
            if (city) return city;
        } catch (e) {
            console.warn("Nominatim Geocoding failed...", e);
        }

        return null;
    };

    // Auto-detect live location as soon as page/app opens without clicking
    useEffect(() => {
        const fetchSilentLocation = async () => {
            const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
            
            // If API key is present, try silent IP-based geolocation first
            if (apiKey) {
                try {
                    setIsLocating(true);
                    const geoRes = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ considerIp: true })
                    });
                    const geoData = await geoRes.json();
                    
                    if (geoData.location) {
                        const { lat, lng } = geoData.location;
                        const detectedCity = await reverseGeocode(lat, lng);
                        if (detectedCity) {
                            setSelectedLocation(detectedCity);
                            setSearchQuery(prev => prev ? prev : detectedCity);
                            localStorage.setItem('user_location', detectedCity);
                            localStorage.setItem('user_coords', JSON.stringify({ lat, lng }));
                            setIsLocating(false);
                            return; // Success, exit
                        }
                    }
                } catch (err) {
                    console.warn("Silent geolocation failed, falling back to browser GPS:", err);
                }
            }

            // Fallback to browser geolocation
            if (!navigator.geolocation) {
                setIsLocating(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const detectedCity = await reverseGeocode(latitude, longitude);
                        if (detectedCity) {
                            setSelectedLocation(detectedCity);
                            setSearchQuery(prev => prev ? prev : detectedCity);
                            localStorage.setItem('user_location', detectedCity);
                            localStorage.setItem('user_coords', JSON.stringify({ lat: latitude, lng: longitude }));
                        }
                    } catch (err) {
                        console.error("Auto detect location error:", err);
                    } finally {
                        setIsLocating(false);
                    }
                },
                (error) => {
                    console.warn("Geolocation auto-detect denied or error:", error);
                    setIsLocating(false);
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        };

        fetchSilentLocation();
    }, []);

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    const walletData = await walletService.getWallet();
                    if (walletData.success && walletData.wallet) {
                        setWalletBalance(walletData.wallet.balance);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch wallet', error);
            }
        };
        fetchWallet();
    }, []);

    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    // Scroll Listener for Sticky & Header Logic
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsSticky(scrollY > 120);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Click outside listener for search suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchClick = (searchOverride) => {
        let url = '/search';
        const params = [];
        const searchTerm = searchOverride !== undefined ? searchOverride : (searchQuery.trim() || selectedLocation);
        if (searchTerm) {
            params.push(`search=${encodeURIComponent(searchTerm)}`);
        }
        if (selectedType && selectedType.id && selectedType.label !== 'All') {
            params.push(`type=${selectedType.id}`);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        navigate(url);
        setIsSearchFocused(false);
    };

    const handleDetectLocation = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const detectedCity = await reverseGeocode(latitude, longitude);
                    
                    if (detectedCity) {
                        setSelectedLocation(detectedCity);
                        localStorage.setItem('user_location', detectedCity);
                        localStorage.setItem('user_coords', JSON.stringify({ lat: latitude, lng: longitude }));
                        let url = `/search?search=${detectedCity}`;
                        if (selectedType && selectedType.id && selectedType.label !== 'All') {
                            url += `&type=${selectedType.id}`;
                        }
                        navigate(url);
                        setIsSearchFocused(false);
                    } else {
                        navigate(`/search?lat=${latitude}&lng=${longitude}`);
                        setIsSearchFocused(false);
                    }
                } catch (error) {
                    console.error("Error fetching location:", error);
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Unable to retrieve your location. Please allow location access in your browser.");
                setIsLocating(false);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    return (
        <motion.section
            className={`relative w-full px-5 pt-4 pb-4 flex flex-col gap-4 md:gap-3 md:pt-8 md:pb-4 bg-transparent transition-all duration-300`}
        >
            {/* 1. Header Row (Hides on Scroll) */}
            <div className={`flex md:hidden items-center justify-between relative h-16 transition-all duration-300 ${isSticky ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-0'}`}>
                {/* Menu Button */}
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2.5 rounded-xl bg-emerald-100/20 hover:bg-emerald-100/35 backdrop-blur-md transition-all duration-300 border border-emerald-100/30 shadow-lg shadow-emerald-900/10 active:scale-90"
                >
                    <Menu size={18} className="text-emerald-50" />
                </button>

                {/* Logo */}
                <div className="flex flex-col items-start leading-none ml-3">
                    <span className="text-2xl font-black tracking-tight text-white flex items-center gap-0 drop-shadow-md">
                        HOOM<span style={{ color: accentColor }} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">ZO</span>
                    </span>
                    <motion.div
                        className="h-[3px] w-8 rounded-full"
                        style={{ backgroundColor: accentColor }}
                        animate={{ width: [32, 24, 32] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                <div className="flex-1" />

                {/* Wallet Balance Display */}
                <button
                    onClick={() => navigate('/wallet')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-400/20 to-emerald-500/10 backdrop-blur-md border border-emerald-300/25 shadow-lg shadow-emerald-900/10 active:scale-95 transition-all duration-300 hover:from-emerald-400/30 hover:to-emerald-500/20"
                >
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-300 to-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/30">
                        <Wallet size={12} className="text-white" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[8px] font-bold text-amber-200/80 uppercase tracking-wider">Wallet</span>
                        <span className="text-[11px] font-extrabold text-white">
                            {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(walletBalance)}
                        </span>
                    </div>
                </button>
            </div>

            {/* Tagline - project related (hidden on mobile) */}
            <div className="hidden md:flex flex-col items-center text-center text-white/95 text-sm md:text-lg font-medium drop-shadow-md px-2 max-w-3xl mx-auto mt-4 mb-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedType?.label || 'All'}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center"
                    >
                        {currentTagline.title ? (
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                {currentTagline.title}
                            </h1>
                        ) : null}
                        {currentTagline.subtitle ? (
                            <p className="text-base md:text-lg font-medium opacity-90">
                                {currentTagline.subtitle}
                            </p>
                        ) : null}
                        <div className="w-12 h-1 mt-4 rounded-full" style={{ backgroundColor: accentColor }} />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* 2. Search Bar - Sticky Logic with smooth animation */}
            <motion.div
                layout
                className={`
                    w-full z-50
                    relative mt-2 md:mt-4
                `}
            >
                <motion.div
                    layout
                    ref={searchRef}
                    onClick={() => setIsSearchFocused(true)}
                    className={`
                        w-full mx-auto max-w-4xl
                        h-14 md:h-16 ${isSearchFocused ? 'rounded-t-2xl' : 'rounded-full'} shadow-2xl shadow-black/20 border border-white/20 bg-white/95 backdrop-blur-xl

                        flex items-center 
                        pr-2 pl-2 md:pl-4
                        gap-2 md:gap-3
                        relative
                        overflow-visible
                        cursor-pointer
                        transition-all duration-300
                    `}
                >
                    {/* Location Dropdown (Desktop only) */}
                    <div className="hidden md:flex items-center gap-2 pr-4 border-r border-gray-200 h-2/3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="font-semibold text-gray-800 text-sm max-w-[100px] truncate">{selectedLocation}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    <div className="pl-2 md:pl-0 flex items-center h-full">
                        <Search size={20} style={{ color: accentColor }} className="z-10" />
                    </div>

                    <div className="flex-1 h-full flex items-center relative z-20">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchFocused(true);
                            }}
                            onFocus={() => setIsSearchFocused(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearchClick();
                                }
                            }}
                            className="w-full h-full bg-transparent outline-none font-medium text-sm md:text-base text-gray-800 pr-6"
                        />

                        {!searchQuery && (
                            <div className="absolute left-0 right-2 h-full flex items-center pointer-events-none z-0">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={placeholderIndex}
                                        initial={{ y: 15, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -15, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="text-gray-400 font-normal text-sm md:text-base w-full truncate"
                                    >
                                        {selectedType?.label === 'Plot' ? "Search by locality, landmark, project or builder..." : placeholders[placeholderIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        )}

                        {searchQuery && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery('');
                                }}
                                className="absolute right-1 text-gray-400 hover:text-gray-600 z-30 p-1"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Search Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSearchClick();
                        }}
                        className="hidden md:flex px-8 py-2.5 rounded-full text-white font-bold transition-transform active:scale-95 shadow-md z-10"
                        style={{ backgroundColor: accentColor }}
                    >
                        Search
                    </button>

                    {/* Filter Icon for Mobile */}
                    <button 
                        className="md:hidden p-2 rounded-full bg-gray-50/50 hover:bg-gray-100 transition-colors z-10 mr-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSearchClick();
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"></line>
                            <line x1="4" y1="12" x2="20" y2="12"></line>
                            <line x1="4" y1="18" x2="12" y2="18"></line>
                        </svg>
                    </button>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {isSearchFocused && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full left-0 right-0 bg-white border-x border-b border-gray-100 rounded-b-2xl shadow-2xl z-50 overflow-hidden"
                            >
                                <div className="p-2 md:p-4 bg-white max-h-[60vh] overflow-y-auto no-scrollbar">
                                    <h4 className="text-xs md:text-sm font-semibold text-gray-500 mb-2 px-2 md:px-4 pt-2">Locations & Suggestions:</h4>
                                    <div className="flex flex-col">
                                        {/* Detect Current Location */}
                                        <div 
                                            className="flex items-center gap-4 p-3 md:px-4 hover:bg-emerald-50/50 cursor-pointer transition-colors border-b border-gray-50 rounded-xl"
                                            onClick={handleDetectLocation}
                                        >
                                            <div className="text-emerald-500">
                                                {isLocating ? (
                                                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="2" x2="12" y2="6"></line>
                                                        <line x1="12" y1="18" x2="12" y2="22"></line>
                                                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                                        <line x1="2" y1="12" x2="6" y2="12"></line>
                                                        <line x1="18" y1="12" x2="22" y2="12"></line>
                                                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                                    </svg>
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-emerald-600 text-sm md:text-base">
                                                    {isLocating ? 'Detecting location...' : 'Use current location'}
                                                </span>
                                                <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Using GPS</span>
                                            </div>
                                        </div>

                                        {/* Dynamic & Popular Location Suggestions */}
                                        {getFilteredHeroLocations().length > 0 ? (
                                            getFilteredHeroLocations().map((loc, idx) => (
                                                <div key={idx} 
                                                     className="flex items-center gap-4 p-3 md:px-4 hover:bg-indigo-50/50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 rounded-xl"
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         setSelectedLocation(loc);
                                                         setSearchQuery(loc);
                                                         localStorage.setItem('user_location', loc);
                                                         handleSearchClick(loc);
                                                     }}
                                                >
                                                    <div className="text-gray-400">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                            <circle cx="12" cy="10" r="3" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-800 text-sm md:text-base">{loc}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Locality / City</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs font-medium text-gray-400">
                                                No matching location found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>

            {/* Placeholder Spacer only when sticky to prevent content jump */}


            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </motion.section>
    );
};

export default HeroSection;
