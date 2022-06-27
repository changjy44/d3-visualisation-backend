const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const neo4j = require("neo4j-driver");
/**
 * Change the following details when connecting to a new neo4j database.
 */
const uri = "neo4j://13.213.80.230:7687";
const user = "neo4j";
const password = "8H2er2re6e";
/*<-----------------------------------------> */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", (req, res) => {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  try {
    async function getAllNodes() {
      console.log(req.body.name);
      const result = await session
        .readTransaction((tx) => {
          const query = req.body.query;
          return tx.run(query);
        })
        .then((data) => {
          if (data.records.length > 0) {
            let finalNodes = [];
            let finalPlayerLinks = [];

            /**
             * This function checks whether the entry is a node or link, and returns its name
             * @param {*} columnEntry
             * @returns name of entry
             */
            function getLabelOrRelation(columnEntry) {
              if (columnEntry.labels) {
                return columnEntry.labels[0];
              } else {
                return columnEntry.type;
              }
            }

            /**
             * This function returns an array of unique player nodes.
             * @param {*} nodesArray
             * @returns An array of unique player nodes.
             */

            function filterNodes(nodesArray) {
              // As long as any node has group 1, it sets all the nodes  with the same name as group 1.
              nodesArray.forEach((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (nodesArray[i].id === nodesArray[index].id) {
                    if (
                      nodesArray[i].group === 1 ||
                      nodesArray[index].group === 1
                    ) {
                      nodesArray[i].group = 1;
                      nodesArray[index].group = 1;
                    }
                  }
                }
              });

              nodesArray = nodesArray.filter((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (nodesArray[i].id === nodesArray[index].id) {
                    return false;
                  }
                }
                return true;
              });
              return nodesArray;
            }

            /**
             * This function returns an array of unique links
             * @param {*} linksArray
             * @returns An array of unique links
             */
            function filterLinks(linksArray) {
              linksArray = linksArray.filter((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (
                    linksArray[i].source === linksArray[index].source &&
                    linksArray[i].target === linksArray[index].target &&
                    linksArray[i].startYear === linksArray[index].startYear
                  ) {
                    return false;
                  }
                }
                return true;
              });
              return linksArray;
            }

            /**
             * This function modifies the instanceNumber and unique attributes of the links
             * instanceNumber counts the number of links that start from the same person, and gives them an index.
             * unique counts the number of links that start from person X to person Y, and gives them an index. These links will
             * be curved in the frontend,.
             *
             * @param {*} linksArray
             * @returns the modified links array
             */
            function editInstanceNumber(linksArray) {
              linksArray.forEach((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (linksArray[i].source === linksArray[index].source) {
                    if (linksArray[i].target === linksArray[index].target) {
                      entry.unique++;
                      entry.curved = true;
                      linksArray[i].curved = true;
                      // linksArray[i].unique = false;
                    }

                    entry.instanceNumber++;
                  }
                }
              });
              return linksArray;
            }

            /**
             * The main bulk of processing the data.
             * All links have the following attributes:
             * source, target, value, startYear, endYear, instanceNumber, unique, curved
             * All playes/clubs have the following attributes
             * id, group, label
             */
            for (let i = 0; i < data.records.length; i++) {
              const rowEntry = data.records[i]._fields;
              for (let j = 0; j < rowEntry.length; j++) {
                const columnEntry = rowEntry[j];
                const label = getLabelOrRelation(columnEntry);
                if (label === "WORKED_AT") {
                  const json = {
                    source: columnEntry.properties.Name,
                    target: columnEntry.properties.clubName,
                    value: 1,
                    startYear: columnEntry.properties.start.low,
                    endYear: columnEntry.properties.end.low,
                    instanceNumber: 1,
                    unique: 1,
                    curved: false,
                  };
                  finalPlayerLinks.push(json);
                } else if (label === "Player") {
                  if (j === 0) {
                    const json = {
                      id: columnEntry.properties.Name,
                      group: 1,
                      label: label,
                    };
                    finalNodes.push(json);
                  } else {
                    const json = {
                      id: columnEntry.properties.Name,
                      group: 3,
                      label: label,
                    };
                    finalNodes.push(json);
                  }
                } else {
                  const json = {
                    id: columnEntry.properties.clubName,
                    group: 2,
                    label: label,
                  };
                  finalNodes.push(json);
                }
              }
            }

            finalNodes = filterNodes(finalNodes);
            finalPlayerLinks = filterLinks(finalPlayerLinks);
            /**
             * Sorts the array so that the most recent link gets colored red in the frontend.
             */
            finalPlayerLinks = finalPlayerLinks.sort((a, b) => {
              return a.startYear > b.startYear ? -1 : 1;
            });
            finalPlayerLinks = editInstanceNumber(finalPlayerLinks);

            var json = {
              nodes: finalNodes,
              links: finalPlayerLinks,
            };

            res.end(JSON.stringify(json));
            return data;
          }
        })
        .catch((e) => {
          console.log(e);
        });
      session.close();
      driver.close();
    }
    getAllNodes();
  } catch (e) {
    console.log(e);
  }
});

app.listen(8000, () => {
  console.log("Server started on port 8000...");
});
