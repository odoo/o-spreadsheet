from PIL import Image
from numpy import asarray
from numpy import rint
from colormap import rgb2hex
import sys

# Takes 4 inputs in cmd line:
input_image = sys.argv[1]  # input File (I only tried .jpg)
SCREEN_WIDTH = int(sys.argv[2])-60  # Width of the canvas in spreadsheet
SCREEN_HEIGHT = int(sys.argv[3])-26  # Height of the canvas in spreadsheet
BLOCKSIZE = int(sys.argv[4])  # Height and Width of each cell in the sheet
# Outputs a file named outputImage.txt containing the model


def colnum_string(n):
    string = ""
    while n > 0:
        n, remainder = divmod(n - 1, 26)
        string = chr(65 + remainder) + string
    return string


# load the image + convert to array
image = Image.open(input_image)
data = asarray(image)

# image size
image_height, image_width, color = data.shape

colnumber = int(SCREEN_WIDTH/BLOCKSIZE)
rownumber = int(SCREEN_HEIGHT/BLOCKSIZE)

pixel_per_block_width = int(image_width/colnumber)
pixel_per_block_height = int(image_height/rownumber)

start = "version: 1,\nsheets: [{\nname: \"Sheet1\",\n"
with open("OutputImage.txt", "w") as text_file:
    text_file.write(start)

with open("OutputImage.txt", "a") as text_file:
    text_file.write("colNumber: "+str(colnumber)+",\n")
with open("OutputImage.txt", "a") as text_file:
    text_file.write("rowNumber: "+str(rownumber)+",\n")

# CELLS
outputfile_cells = "cells: {"
for i in range(colnumber):
    for j in range(rownumber):
        col = colnum_string(i+1)
        cell_id = col+str(j+1)
        outputfile_cells += cell_id+": { content: \"=Sheet2!A1\" },\n"
outputfile_cells += "},\n"
with open("OutputImage.txt", "a") as text_file:
    text_file.write(outputfile_cells)

# CF
outputfile_cf = "conditionalFormats: ["
counter_cf = 1
for i in range(colnumber):
    for j in range(rownumber):
        start_row_block = i*pixel_per_block_width
        start_col_block = j*pixel_per_block_height
        color_sum = ([0, 0, 0])
        nbr_pixels = 0
        for k in range(pixel_per_block_width):
            for l in range(pixel_per_block_height):
                color_sum += data[start_col_block+l][start_row_block+k]
                nbr_pixels += 1
        r, g, b = rint(color_sum/nbr_pixels)
        hexval = rgb2hex(int(r), int(g), int(b))
        col = colnum_string(i+1)
        cell_id = col+str(j+1)
        outputfile_cf += "{\n"
        outputfile_cf += "id: \""+str(counter_cf)+"\",\n"
        outputfile_cf += "ranges: [\""+cell_id+"\"],\n"
        outputfile_cf += "rule: {\n"
        outputfile_cf += "values: [\""+str(1)+"\"],\n"
        outputfile_cf += "operator: \"Equal\",\n"
        outputfile_cf += "type: \"CellIsRule\",\n"
        outputfile_cf += "style: { textColor: \""+str(hexval)+"\", fillColor: \""+str(hexval)+"\" }\n"
        outputfile_cf += "}\n"
        outputfile_cf += "},\n"
        counter_cf += 1
outputfile_cf += "],\n"

with open("OutputImage.txt", "a") as text_file:
    text_file.write(outputfile_cf)

# COLS and ROWS
outputfile_cols = "cols: {"
for i in range(colnumber):
    outputfile_cols += str(i)+": {size: "+str(BLOCKSIZE)+"},\n"
outputfile_cols += "},\n"

with open("OutputImage.txt", "a") as text_file:
    text_file.write(outputfile_cols)


outputfile_rows = "rows: {"
for i in range(rownumber):
    outputfile_rows += str(i)+": {size: "+str(BLOCKSIZE)+"},\n"
outputfile_rows += "},"

with open("OutputImage.txt", "a") as text_file:
    text_file.write(outputfile_rows)

end = "},\n {name: \"Sheet2\",\n"
col_num2 = "colNumber: "+str(colnumber)+",\n"
row_num2 = "rowNumber: "+str(rownumber)+",\n"
cells2 = "cells: {\nA1: {content: \"1\"}\n},"
# row2 = outputfile_rows
# col2 = outputfile_cols
# end = end + col_num2 + row_num2 + cells2 + row2 + col2 +"\n}],"
end = end + col_num2 + row_num2 + cells2 +"\n}],"
with open("OutputImage.txt", "a") as text_file:
    text_file.write(end)

