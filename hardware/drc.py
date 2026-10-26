"""Runs KiCad's design-rule check on stick.kicad_pcb (kicad-cli 7 has no DRC). Usage: python3 drc.py [report.txt]"""
import sys, pcbnew
HERE = __file__.rsplit("/", 1)[0]
out = sys.argv[1] if len(sys.argv) > 1 else HERE + "/drc-report.txt"
board = pcbnew.LoadBoard(HERE + "/stick.kicad_pcb")
pcbnew.ZONE_FILLER(board).Fill(board.Zones())
pcbnew.WriteDRCReport(board, out, pcbnew.EDA_UNITS_MILLIMETRES, True)
