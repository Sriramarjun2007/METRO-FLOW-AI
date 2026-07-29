"""Quick helper - copy *.py.py files into *.py files (can't rename on FUSE)."""
import os

src_dir = "/home/user/workspaces/86cb8eff-38a3-4cc7-8fa4-77e821006577/backend/agents"

for f in sorted(os.listdir(src_dir)):
    if f.endswith(".py.py"):
        target = f[:-3]
        with open(os.path.join(src_dir, f), "r") as fr:
            content = fr.read()
        with open(os.path.join(src_dir, target), "w") as fw:
            fw.write(content)
        # Overwrite stub version of the duplicate (we can't rm on FUSE)
        with open(os.path.join(src_dir, f), "w") as fe:
            fe.write("# (stub - superseded)\n")
print("done")
print(sorted(os.listdir(src_dir)))
