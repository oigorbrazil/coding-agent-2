/// Bundle ids of the apps whose computer-use sidecar may drive this helper.
public enum TrustedOrcaApplication {
    public static func isTrusted(bundleId: String) -> Bool {
        // Why: `pnpm dev` launches as `com.codingagent.desktop2.dev` and per-worktree wrapper apps use
        // `com.codingagent.desktop2.dev.<name>`; the sidecar peer check must authorize both (#26498).
        bundleId == "com.codingagent.desktop2" ||
            bundleId == "com.codingagent.desktop2.dev" ||
            bundleId.hasPrefix("com.codingagent.desktop2.dev.") ||
            bundleId == "com.github.Electron"
    }
}
