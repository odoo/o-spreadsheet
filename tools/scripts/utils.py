import contextlib
import os
import re
import subprocess

from const import USER_HOME

# See https://stackoverflow.com/questions/6194499/pushd-through-os-system
# Allows one to execute code in a given dir
@contextlib.contextmanager
def pushd(new_dir):
    previous_dir = os.getcwd()
    os.chdir(new_dir)
    try:
        yield
    finally:
        os.chdir(previous_dir)


def guess_enterprise_repo() -> str:
    print("looking for Odoo Enterprise repository...")
    try:
        cmd = ['find', USER_HOME, '-type', 'd',
               '-iname', 'documents_spreadsheet']
        result = subprocess.check_output(cmd).decode("utf-8").split("\n")[:-1]
        result = [re.sub('\/documents_spreadsheet$', "", r) for r in result]
    except Exception:
        result = []

    repos = {
        str(index+1): proposition for (index, proposition)
        in enumerate(result)
    }
    repos_guess = "\n".join(["%s: %s" % (i, p) for [i, p] in repos.items()])
    print(f"\nsuggested repo path: \n{repos_guess}")
    answer = input("\nyour repo path: ")
    return repos.get(answer, answer)


def get_remote_old(repo_path) -> str:
    with pushd(repo_path):
        cmd = ['git', 'remote']
        values = subprocess.check_output(
            cmd).decode("utf-8").split("\n")[:-1]
        remotes = {
            str(index+1): proposition for
            (index, proposition) in enumerate(values)
        }
        remotes_guess = "\n".join(["%s: %s" % (i, p)
                                   for [i, p] in remotes.items()])
        print(f"\nChoose a remote: \n{remotes_guess}")
        answer = input("enter an index: ")
        return remotes.get(answer, answer)

def get_remote(exec_path, remote_addr) -> str:
    with pushd(exec_path):
        cmd = ['git', 'remote', '-v']
        remotes = subprocess.check_output(
            cmd).decode("utf-8").split("\n")
        remote = [remote for remote in remotes if remote_addr in remote][0]
        return remote.split()[0]