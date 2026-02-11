import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to detect scroll state and enable performance optimizations
 * Returns true while user is actively scrolling
 */
const useScrollPerformance = (scrollRef, debounceMs = 150) => {
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef(null);

    useEffect(() => {
        const element = scrollRef?.current;
        if (!element) return;

        const handleScroll = () => {
            // Set scrolling state to true
            setIsScrolling(true);

            // Clear existing timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Set timeout to mark scrolling as done
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, debounceMs);
        };

        element.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            element.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [scrollRef, debounceMs]);

    return isScrolling;
};

export default useScrollPerformance;
