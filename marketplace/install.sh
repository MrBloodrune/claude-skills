#!/bin/bash
# Bloodrune Skills Marketplace Installer
# Usage: ./install.sh [skill-name] [--list] [--search query] [--category name]

set -e

REPO_URL="https://github.com/MrBloodrune/claude-skills"
REPO_NAME="claude-skills"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CATALOG_FILE="$SCRIPT_DIR/catalog.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}Bloodrune Skills Marketplace${NC}                              ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_usage() {
    echo -e "${BOLD}Usage:${NC}"
    echo "  ./install.sh [command] [options]"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo "  list                    List all available skills"
    echo "  install <skill-name>    Install a specific skill"
    echo "  search <query>          Search for skills"
    echo "  category <name>         List skills by category"
    echo "  info <skill-name>       Show detailed skill information"
    echo "  help                    Show this help message"
    echo ""
    echo -e "${BOLD}Categories:${NC}"
    echo "  web-tools      Web development tools"
    echo "  media-tools    Media processing tools"
    echo "  development    Software development tools"
    echo "  productivity   Workflow enhancement tools"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo "  ./install.sh list"
    echo "  ./install.sh install html-tools"
    echo "  ./install.sh search ascii"
    echo "  ./install.sh category media-tools"
}

check_dependencies() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq is not installed. Some features may not work.${NC}"
        echo "Install with: sudo apt install jq (Ubuntu/Debian) or brew install jq (macOS)"
        return 1
    fi
    return 0
}

list_skills() {
    print_header
    echo -e "${BOLD}Available Skills:${NC}"
    echo ""

    if check_dependencies; then
        jq -r '.skills[] | "  \(.id) - \(.description) [\(.category)]"' "$CATALOG_FILE"
    else
        echo "  html-tools - Create single-file HTML tools [web-tools]"
        echo "  ascii-image-converter - Convert images to ASCII art [media-tools]"
    fi
    echo ""
}

list_by_category() {
    local category="$1"
    print_header
    echo -e "${BOLD}Skills in category: ${CYAN}$category${NC}"
    echo ""

    if check_dependencies; then
        jq -r --arg cat "$category" '.skills[] | select(.category == $cat) | "  \(.id) - \(.description)"' "$CATALOG_FILE"
    else
        echo -e "${RED}Error: jq is required for category filtering${NC}"
    fi
    echo ""
}

search_skills() {
    local query="$1"
    print_header
    echo -e "${BOLD}Search results for: ${CYAN}$query${NC}"
    echo ""

    if check_dependencies; then
        jq -r --arg q "$query" '.skills[] | select(.name | test($q; "i")) + select(.description | test($q; "i")) + select(.tags[] | test($q; "i")) | "  \(.id) - \(.description)"' "$CATALOG_FILE" 2>/dev/null | sort -u
    else
        # Fallback grep search
        grep -i "$query" "$CATALOG_FILE" | head -10
    fi
    echo ""
}

show_info() {
    local skill_id="$1"
    print_header

    if check_dependencies; then
        local skill_info
        skill_info=$(jq -r --arg id "$skill_id" '.skills[] | select(.id == $id)' "$CATALOG_FILE")

        if [ -z "$skill_info" ]; then
            echo -e "${RED}Error: Skill '$skill_id' not found${NC}"
            return 1
        fi

        echo -e "${BOLD}Skill Information:${NC}"
        echo ""
        echo -e "  ${BOLD}Name:${NC}        $(echo "$skill_info" | jq -r '.name')"
        echo -e "  ${BOLD}ID:${NC}          $(echo "$skill_info" | jq -r '.id')"
        echo -e "  ${BOLD}Version:${NC}     $(echo "$skill_info" | jq -r '.version')"
        echo -e "  ${BOLD}Author:${NC}      $(echo "$skill_info" | jq -r '.author')"
        echo -e "  ${BOLD}Category:${NC}    $(echo "$skill_info" | jq -r '.category')"
        echo -e "  ${BOLD}Description:${NC} $(echo "$skill_info" | jq -r '.description')"
        echo -e "  ${BOLD}Tags:${NC}        $(echo "$skill_info" | jq -r '.tags | join(", ")')"

        local requires
        requires=$(echo "$skill_info" | jq -r '.requires | if length > 0 then join(", ") else "None" end')
        echo -e "  ${BOLD}Requires:${NC}    $requires"
        echo ""

        # Show skill file path
        local skill_path
        skill_path=$(echo "$skill_info" | jq -r '.path')
        echo -e "  ${BOLD}Local Path:${NC}  $REPO_DIR/$skill_path"
        echo ""
    else
        echo -e "${RED}Error: jq is required for skill info${NC}"
    fi
}

install_skill() {
    local skill_id="$1"
    print_header

    echo -e "${BOLD}Installing skill: ${CYAN}$skill_id${NC}"
    echo ""

    # Get skill info
    local skill_path
    if check_dependencies; then
        skill_path=$(jq -r --arg id "$skill_id" '.skills[] | select(.id == $id) | .path' "$CATALOG_FILE")

        if [ -z "$skill_path" ] || [ "$skill_path" == "null" ]; then
            echo -e "${RED}Error: Skill '$skill_id' not found in catalog${NC}"
            echo "Use './install.sh list' to see available skills"
            return 1
        fi
    else
        # Fallback for known skills
        case "$skill_id" in
            "html-tools") skill_path="skills/html-tools" ;;
            "ascii-image-converter") skill_path="skills/ascii-image-converter" ;;
            *)
                echo -e "${RED}Error: Cannot verify skill without jq installed${NC}"
                return 1
                ;;
        esac
    fi

    local full_path="$REPO_DIR/$skill_path"

    if [ ! -d "$full_path" ]; then
        echo -e "${RED}Error: Skill directory not found at $full_path${NC}"
        return 1
    fi

    echo -e "${GREEN}✓${NC} Found skill at: $full_path"

    # Determine Claude Code settings directory
    local claude_settings=""
    if [ -d "$HOME/.claude" ]; then
        claude_settings="$HOME/.claude"
    elif [ -d "$HOME/.config/claude-code" ]; then
        claude_settings="$HOME/.config/claude-code"
    fi

    echo ""
    echo -e "${BOLD}Installation Options:${NC}"
    echo ""
    echo "1. Add to Claude Code via plugin command:"
    echo -e "   ${CYAN}/plugin marketplace add MrBloodrune/claude-skills${NC}"
    echo ""
    echo "2. Copy skill to local .claude directory:"
    echo -e "   ${CYAN}mkdir -p .claude/skills && cp -r $full_path .claude/skills/${NC}"
    echo ""
    echo "3. Symlink skill (for development):"
    echo -e "   ${CYAN}mkdir -p .claude/skills && ln -s $full_path .claude/skills/$skill_id${NC}"
    echo ""

    # Check for requirements
    if check_dependencies; then
        local requires
        requires=$(jq -r --arg id "$skill_id" '.skills[] | select(.id == $id) | .requires[]' "$CATALOG_FILE" 2>/dev/null)

        if [ -n "$requires" ]; then
            echo -e "${YELLOW}⚠ This skill requires the following to be installed:${NC}"
            for req in $requires; do
                if command -v "$req" &> /dev/null; then
                    echo -e "  ${GREEN}✓${NC} $req (installed)"
                else
                    echo -e "  ${RED}✗${NC} $req (not found)"
                fi
            done
            echo ""
        fi
    fi

    echo -e "${GREEN}Done!${NC} Skill information displayed."
}

# Main
case "${1:-help}" in
    list|--list|-l)
        list_skills
        ;;
    install|--install|-i)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify a skill name${NC}"
            echo "Usage: ./install.sh install <skill-name>"
            exit 1
        fi
        install_skill "$2"
        ;;
    search|--search|-s)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify a search query${NC}"
            echo "Usage: ./install.sh search <query>"
            exit 1
        fi
        search_skills "$2"
        ;;
    category|--category|-c)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify a category${NC}"
            echo "Usage: ./install.sh category <name>"
            exit 1
        fi
        list_by_category "$2"
        ;;
    info|--info)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify a skill name${NC}"
            echo "Usage: ./install.sh info <skill-name>"
            exit 1
        fi
        show_info "$2"
        ;;
    help|--help|-h)
        print_header
        print_usage
        ;;
    *)
        # Try to install if it looks like a skill name
        install_skill "$1"
        ;;
esac
