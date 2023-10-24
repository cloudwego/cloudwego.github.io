import os

def consolidate_md_files(root_dir, output_file):
    with open(output_file, 'w') as outfile:
        for dir_path, dir_names, file_names in os.walk(root_dir):
            for file_name in file_names:
                if file_name.endswith('.md'):
                    with open(os.path.join(dir_path, file_name), 'r') as infile:
                        outfile.write(infile.read())
                        outfile.write('\n\n')

root_directory = './'  # Put your url path here
output_file = 'consolidated.md'
consolidate_md_files(root_directory, output_file)
