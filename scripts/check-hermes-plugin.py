#!/usr/bin/env python3

import os
import shutil
import tempfile
from pathlib import Path


root = Path(__file__).resolve().parent.parent

with tempfile.TemporaryDirectory(prefix="locus-hermes-") as temporary:
    home = Path(temporary)
    bundled = home / "bundled"
    bundled.mkdir()
    shutil.copytree(root / "agents/hermes", home / "plugins/locus")
    (home / "config.yaml").write_text("plugins:\n  enabled: [locus]\n", encoding="utf-8")
    os.environ["HERMES_HOME"] = str(home)
    os.environ["HERMES_BUNDLED_PLUGINS"] = str(bundled)

    from hermes_cli.plugins import discover_plugins, get_plugin_manager
    from tools.mcp_tool_config import _load_mcp_config

    discover_plugins()
    skills = [
        item["name"].rsplit(":", 1)[-1]
        for item in get_plugin_manager().list_plugin_skill_metadata()
    ]
    servers = _load_mcp_config()

    assert skills == ["locus", "locus-setup", "locus-workflows"], skills
    assert len(servers) == 1, servers
    server_name, server = next(iter(servers.items()))
    assert server_name.endswith("__locus"), server_name
    assert server["url"] == "https://api.paywithlocus.com/api/credits/mcp", server
    assert server["headers"] == {"X-Source-Name": "hermes-plugin"}, server

print("Hermes plugin MCP and skill discovery: OK")
