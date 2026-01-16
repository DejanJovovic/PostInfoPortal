import { pickRandomAd } from '@/constants/ads';
import React from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import CustomBanner from './CustomBanner';
import CustomPostsSection from './CustomPostsSection';

interface HomeContentProps {
    generalGroupedPosts: Record<string, any[]>;
    lokalGroupedPosts: Record<string, any[]>;
    beogradGroupedPosts: Record<string, any[]>;
    okruziGroupedPosts: Record<string, any[]>;
    refreshing: boolean;
    onRefresh: () => void;
    onPostPress: (postId: number, categoryName: string) => void;
    loadingNav: boolean;
}

const HomeContent: React.FC<HomeContentProps> = ({
    generalGroupedPosts,
    lokalGroupedPosts,
    beogradGroupedPosts,
    okruziGroupedPosts,
    refreshing,
    onRefresh,
    onPostPress,
    loadingNav,
}) => {
    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* 1) General categories except Događaji/Lokal/Region/Planeta */}
            {Object.entries(generalGroupedPosts)
                .filter(([name]) => !['Događaji', 'Lokal', 'Region', 'Planeta'].includes(name))
                .map(([categoryName, categoryPosts], idx) => {
                    const ad = pickRandomAd();
                    return (
                        <React.Fragment key={categoryName}>
                            <CustomPostsSection
                                categoryName={categoryName}
                                posts={categoryPosts}
                                isHome
                                onPostPress={onPostPress}
                                loadingNav={loadingNav}
                            />
                            <CustomBanner
                                key={`ad-general-${idx}`}
                                url={ad.url}
                                imageSrc={ad.imageSrc}
                                videoSrc={ad.videoSrc}
                            />
                        </React.Fragment>
                    );
                })}

            {/* 2) Događaji */}
            {(generalGroupedPosts['Događaji']?.length ?? 0) > 0 && (() => {
                const ad = pickRandomAd();
                return (
                    <>
                        <CustomPostsSection
                            key="Događaji"
                            categoryName="Događaji"
                            posts={generalGroupedPosts['Događaji'] || []}
                            isHome
                            onPostPress={onPostPress}
                            loadingNav={loadingNav}
                        />
                        <CustomBanner
                            key="ad-dogadjaji"
                            url={ad.url}
                            imageSrc={ad.imageSrc}
                            videoSrc={ad.videoSrc}
                        />
                    </>
                );
            })()}

            {/* 3) Lokal */}
            {(generalGroupedPosts['Lokal']?.length ?? 0) > 0 && (() => {
                const ad = pickRandomAd();
                return (
                    <>
                        <CustomPostsSection
                            key="Lokal"
                            categoryName="Lokal"
                            posts={generalGroupedPosts['Lokal'] || []}
                            isHome
                            onPostPress={onPostPress}
                            loadingNav={loadingNav}
                        />
                        <CustomBanner
                            key="ad-lokal"
                            url={ad.url}
                            imageSrc={ad.imageSrc}
                            videoSrc={ad.videoSrc}
                        />
                    </>
                );
            })()}

            {/* 4) Beograd */}
            {(lokalGroupedPosts['Beograd']?.length ?? 0) > 0 && (() => {
                const ad = pickRandomAd();
                return (
                    <>
                        <CustomPostsSection
                            key="Beograd"
                            categoryName="Beograd"
                            posts={lokalGroupedPosts['Beograd'] || []}
                            isHome
                            onPostPress={onPostPress}
                            loadingNav={loadingNav}
                        />
                        <CustomBanner
                            key="ad-beograd"
                            url={ad.url}
                            imageSrc={ad.imageSrc}
                            videoSrc={ad.videoSrc}
                        />
                    </>
                );
            })()}

            {/* 5) Beograd subcategories */}
            {Object.entries(beogradGroupedPosts)
                .filter(([, arr]) => (arr?.length ?? 0) > 0)
                .map(([categoryName, categoryPosts], idx) => {
                    const ad = pickRandomAd();
                    return (
                        <React.Fragment key={categoryName}>
                            <CustomPostsSection
                                categoryName={categoryName}
                                posts={categoryPosts}
                                isHome
                                onPostPress={onPostPress}
                                loadingNav={loadingNav}
                            />
                            <CustomBanner
                                key={`ad-beograd-sub-${idx}`}
                                url={ad.url}
                                imageSrc={ad.imageSrc}
                                videoSrc={ad.videoSrc}
                            />
                        </React.Fragment>
                    );
                })}

            {/* 6) Gradovi */}
            {(lokalGroupedPosts['Gradovi']?.length ?? 0) > 0 && (() => {
                const ad = pickRandomAd();
                return (
                    <>
                        <CustomPostsSection
                            key="Gradovi"
                            categoryName="Gradovi"
                            posts={lokalGroupedPosts['Gradovi'] || []}
                            isHome
                            onPostPress={onPostPress}
                            loadingNav={loadingNav}
                        />
                        <CustomBanner
                            key="ad-gradovi"
                            url={ad.url}
                            imageSrc={ad.imageSrc}
                            videoSrc={ad.videoSrc}
                        />
                    </>
                );
            })()}

            {/* 7) Okruzi */}
            {(lokalGroupedPosts['Okruzi']?.length ?? 0) > 0 && (() => {
                const ad = pickRandomAd();
                return (
                    <>
                        <CustomPostsSection
                            key="Okruzi"
                            categoryName="Okruzi"
                            posts={lokalGroupedPosts['Okruzi'] || []}
                            isHome
                            onPostPress={onPostPress}
                            loadingNav={loadingNav}
                        />
                        <CustomBanner
                            key="ad-okruzi"
                            url={ad.url}
                            imageSrc={ad.imageSrc}
                            videoSrc={ad.videoSrc}
                        />
                    </>
                );
            })()}

            {/* 8) Podkategorije Okruga */}
            {Object.entries(okruziGroupedPosts)
                .filter(([, arr]) => (arr?.length ?? 0) > 0)
                .map(([categoryName, categoryPosts], idx) => {
                    const ad = pickRandomAd();
                    return (
                        <React.Fragment key={categoryName}>
                            <CustomPostsSection
                                categoryName={categoryName}
                                posts={categoryPosts}
                                isHome
                                onPostPress={onPostPress}
                                loadingNav={loadingNav}
                            />
                            <CustomBanner
                                key={`ad-okruzi-sub-${idx}`}
                                url={ad.url}
                                imageSrc={ad.imageSrc}
                                videoSrc={ad.videoSrc}
                            />
                        </React.Fragment>
                    );
                })}

            {/* 9) Region i Planeta */}
            {['Region', 'Planeta'].map((name, idx) =>
                (generalGroupedPosts[name]?.length ?? 0) > 0 ? (() => {
                    const ad = pickRandomAd();
                    return (
                        <React.Fragment key={name}>
                            <CustomPostsSection
                                categoryName={name}
                                posts={generalGroupedPosts[name] || []}
                                isHome
                                onPostPress={onPostPress}
                                loadingNav={loadingNav}
                            />
                            <CustomBanner
                                key={`ad-${name}-${idx}`}
                                url={ad.url}
                                imageSrc={ad.imageSrc}
                                videoSrc={ad.videoSrc}
                            />
                        </React.Fragment>
                    );
                })() : null
            )}
        </ScrollView>
    );
};

export default HomeContent;
