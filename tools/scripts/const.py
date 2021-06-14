from os import path

USER_HOME = path.expanduser('~')
CONFIG_FILE_PATH = path.join(USER_HOME, ".spConfig.ini")
REPO_PATH = path.abspath(path.join(path.dirname(path.abspath(__file__)), "..", ".."))
