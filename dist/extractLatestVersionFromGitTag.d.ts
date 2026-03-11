interface VersionResult {
    version: string;
    versionWithoutV: string;
    major: string;
    minor: string;
    patch: string;
    prerelease: string;
    build: string;
    isPrerelease: string;
    isSemver: string;
}
interface ExtractOptions {
    prefix?: string;
    disableAutoPatchCount?: boolean;
    [key: string]: unknown;
}
export declare function extractLatestVersionFromGitTag(options?: ExtractOptions): VersionResult;
export {};
//# sourceMappingURL=extractLatestVersionFromGitTag.d.ts.map