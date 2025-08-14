import { Href } from 'expo-router';

export const globalSearch = (): Href => ({
    pathname: '/',
    params: { openSearch: '1' }, // string for URL safety
});