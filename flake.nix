{
  description = "Slide Ship - Gamified presentation framework";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        runDev = pkgs.writeShellScriptBin "slide-ship-dev" ''
          if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
          fi
          echo "Starting Slide Ship dev server..."
          echo "Open http://localhost:5173"
          npm run dev
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.typescript
            nodePackages.typescript-language-server
            runDev
          ];

          shellHook = ''
            echo "Slide Ship dev environment loaded"
            echo "Node: $(node --version)"
            echo ""
            echo "Commands:"
            echo "  slide-ship-dev  - Install deps (if needed) and start dev server"
            echo "  npm run dev     - Start dev server"
            echo "  npm run build   - Build for production"
          '';
        };
      });
}
