import os
import re
import configparser
import subprocess
from const import CONFIG_FILE_PATH, REPO_PATH
from utils import guess_enterprise_repo, get_remote
from shutil import which

CONFIG_KEYS = ['enterprise', 'spreadsheet']


def get_config() -> configparser.ConfigParser:
    if os.path.isfile(CONFIG_FILE_PATH):
        config = configparser.ConfigParser()
        config.read(CONFIG_FILE_PATH)

        if (not all([key in config for key in CONFIG_KEYS])):
            raise Exception(
                f"Your config file is corrupted. Please fix it or delete it.\nPath: {CONFIG_FILE_PATH}")
        return config
    else:
        return create_config()


def check_gh():
    if which("gh") is None:
        raise Exception(
            "Please configure github cli: https://github.com/cli/cli/blob/trunk/docs/install_linux.md")
    try:
        subprocess.check_output(["gh", "auth", "status"])
    except Exception as e:
        raise Exception("Please login on github cli: run `gh auth login`")


def create_config() -> configparser.ConfigParser:
    config = configparser.ConfigParser()
    print("\n*** Configuring spreadsheet repository ***")
    print("------------------------------------------")
    config['spreadsheet'] = {"repo_path": REPO_PATH,
                               "remote": get_remote(REPO_PATH, 'odoo/o-spreadsheet')}

    print("\n*** Configuring enterprise repository ***")
    print("-----------------------------------------")
    ent_repo_path = guess_enterprise_repo()
    config['enterprise'] = {"repo_path": ent_repo_path,
                            "remote-dev": get_remote(ent_repo_path, 'odoo-dev/enterprise'),
                            "remote": get_remote(ent_repo_path, 'odoo/enterprise'),
                            }

    with open(CONFIG_FILE_PATH, 'w') as configfile:    # save
        config.write(configfile)
    print("Congratulations, you are now set up!\n\n")
    return config


config = get_config()
