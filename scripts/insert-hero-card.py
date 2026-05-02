"""Insert DashboardHeroCard and DashboardActionRow into index.tsx"""
import re

FILE = "app/(tabs)/index.tsx"

with open(FILE, "r") as f:
    content = f.read()

# 1. Add imports after the last import line (after UI, SF import)
import_line = 'import { UI, SF } from "@/constants/ui-colors";'
import_addition = '''import { UI, SF } from "@/constants/ui-colors";
import { DashboardHeroCard } from "@/components/dashboard-hero-card";
import { DashboardActionRow } from "@/components/dashboard-action-row";'''
content = content.replace(import_line, import_addition, 1)

# 2. Insert the Hero Card + Action Row before the NEXT BEST ACTION section
# Find the line with "NEXT BEST ACTION" and the preceding comment block
nba_marker = "NEXT BEST ACTION"
idx = content.find(nba_marker)
if idx == -1:
    print("ERROR: Could not find NEXT BEST ACTION marker")
    exit(1)

# Go back to find the start of the comment block (the line with {/* ═══...
# We need to find the start of the line containing the box-drawing chars before NEXT BEST ACTION
# Find the line start before the NEXT BEST ACTION line
line_start = content.rfind("\n", 0, idx)
# Go back one more line to find the box-drawing comment
prev_line_start = content.rfind("\n", 0, line_start)
# And one more to find the empty line before
prev_prev_line_start = content.rfind("\n", 0, prev_line_start)

# Insert our Hero Card right before the box-drawing comment block
insert_point = prev_prev_line_start + 1  # after the newline

hero_card_block = """
          {/* ── DASHBOARD HERO CARD + ACTION ROW (Batch 1) ── */}
          <StaggeredCard index={0}>
            <DashboardHeroCard displayName={displayName} />
            <DashboardActionRow hasWorkoutPlan={!!(workoutPlan ?? localWorkoutPlan)} />
          </StaggeredCard>

"""

content = content[:insert_point] + hero_card_block + content[insert_point:]

with open(FILE, "w") as f:
    f.write(content)

print("SUCCESS: Inserted DashboardHeroCard and DashboardActionRow")
