## fiscars - file scanner
This is a node.js app for scanning a directory (or multiple directories) for files and put their status into database.
### Disclaimer
The product is provided AS IS without any warranty or support. The author is not responsible for any damage that might be caused by using this software.
### Installation
- Install node*, if it is not already installed
- Clone this repository
- Prepare a database table with name of your choice with columns fs_file (VARCHAR), fs_ctimems (NUMERIC(17,4)), fs_ctime (DATETIME), fs_size (INT), fs_version (INT), fs_update (DATETIME), fs_status (VARCHAR)
- Run "node main.js" to create settings file
- End the process by clicking Ctrl + C
- Edit the generated settings.json file according to your environment. Note that settings in arrays can be set to scan different directories with different parameters. 
### Run
- node main.js
#### Tested on:
- (*) node v14.21.1 and 18.12.1
- Ubuntu 18.04 and 20.04
